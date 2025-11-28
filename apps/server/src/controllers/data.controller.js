import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';

export const getTables = async (req, res) => {
    try {
        // Prisma.dmmf.datamodel.models contains the list of models defined in schema.prisma
        // We filter out models that might not map to actual tables if necessary, 
        // but usually all models in DMMF correspond to tables.
        const tables = Prisma.dmmf.datamodel.models.map((model) => model.name);
        res.json({ tables });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
};

export const getTableData = async (req, res) => {
    const { tableName } = req.params;

    try {
        // Check if the model exists in the Prisma client
        // Note: Prisma client keys are usually camelCase version of model names if they differ,
        // but typically we access them via prisma[modelName] (case-sensitive usually, or camelCase).
        // Let's check the DMMF to get the correct client property name if needed, 
        // but usually it matches the model name or is camelCased.

        // A safer way is to find the model in DMMF and check its name.
        const model = Prisma.dmmf.datamodel.models.find(
            (m) => m.name === tableName
        );

        if (!model) {
            return res.status(404).json({ error: `Table '${tableName}' not found` });
        }

        // Access the delegate. Prisma client properties are typically lowerCamelCase of the model name.
        // e.g. model User -> prisma.user
        // e.g. model MenuItem -> prisma.menuItem
        // We need to convert the PascalCase model name to camelCase.
        const modelNameCamel = tableName.charAt(0).toLowerCase() + tableName.slice(1);

        // However, sometimes it's not strictly just lowercase first letter if it's all caps etc.
        // But for standard PascalCase models, this works.

        const delegate = prisma[modelNameCamel];

        if (!delegate) {
            // Fallback or error if we can't find the delegate
            // It might be that for some reason the client property is different.
            // Let's try to iterate keys of prisma to find a match if simple camelCase fails?
            // For now, simple camelCase is the standard.
            return res.status(400).json({ error: `Could not access data for table '${tableName}'` });
        }

        const data = await delegate.findMany({
            take: 100, // Limit to 100 records for performance
            orderBy: {
                // We don't know the primary key for sure without checking DMMF, 
                // but usually 'createdAt' exists or 'id'. 
                // Let's try to order by createdAt if it exists, otherwise just default order.
            }
        });

        res.json({ data });
    } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
};
