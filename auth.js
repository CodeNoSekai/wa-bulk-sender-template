import pkg from '@fizzxydev/baileys-pro';
const { proto } = pkg;
import { initAuthCreds } from "@fizzxydev/baileys-pro"


const BufferJSON = {
    replacer: (_, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
            return {
                type: 'Buffer',
                data: Buffer.from(value?.data || value).toString('base64')
            }
        }
        return value
    },
    reviver: (_, value) => {
        if (typeof value === 'object' && value !== null && 
            (value.buffer === true || value.type === 'Buffer')) {
            const val = value.data || value.value
            return typeof val === 'string' 
                ? Buffer.from(val, 'base64')
                : Buffer.from(val || [])
        }
        return value
    }
}

export const useMongoDBAuthState = async (collection) => {
    // Helper functions for database operations
    const insertData = async (data) => {
        try {
            const serializedData = JSON.parse(JSON.stringify(data, BufferJSON.replacer))
            return await collection.insertOne({
                ...serializedData,
                createdAt: new Date()
            })
        } catch (error) {
            console.error('Error inserting data:', error)
            throw error
        }
    }

    const updateOne = async (filter, update) => {
        try {
            const serializedUpdate = JSON.parse(JSON.stringify(update, BufferJSON.replacer))
            return await collection.updateOne(filter, { $set: serializedUpdate })
        } catch (error) {
            console.error('Error updating data:', error)
            throw error
        }
    }

    const writeData = async (data, id) => {
        try {
            // Prepare the data with proper serialization
            const serializedData = JSON.parse(JSON.stringify(data, BufferJSON.replacer))
            
            // Ensure we're not passing any undefined values
            const cleanData = {
                ...serializedData,
                _id: id
            }

            // Delete any undefined or null values
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined || cleanData[key] === null) {
                    delete cleanData[key]
                }
            })

            // Use updateOne with upsert instead of replaceOne
            await collection.updateOne(
                { _id: id },
                { $set: cleanData },
                { upsert: true }
            )

            return cleanData
        } catch (error) {
            console.error('Error writing data:', error)
            throw error
        }
    }

    const find = async (query = {}) => {
        try {
            return await collection.find(query).toArray()
        } catch (error) {
            console.error('Error finding data:', error)
            throw error
        }
    }

    const readData = async (id) => {
        try {
            const data = await collection.findOne({ _id: id })
            if (!data) return null
            
            // Remove _id from the data before parsing
            const { _id, ...dataWithoutId } = data
            return JSON.parse(JSON.stringify(dataWithoutId), BufferJSON.reviver)
        } catch (error) {
            console.error('Error reading data:', error)
            return null
        }
    }

    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id })
        } catch (error) {
            console.error('Error removing data:', error)
        }
    }

    // Initialize credentials
    const creds = (await readData('creds')) || initAuthCreds()

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`)
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value)
                            }
                            data[id] = value
                        })
                    )
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id]
                            const key = `${category}-${id}`
                            tasks.push(value ? writeData(value, key) : removeData(key))
                        }
                    }
                    await Promise.all(tasks)
                }
            }
        },
        saveState: async (cred) => {
            const newCreds = { ...creds, ...cred }
            return await writeData(newCreds, 'creds')
        },
        saveCreds: () => writeData(creds, 'creds'),
        writeData,
        insertData,
        find,
        updateOne
    }
}