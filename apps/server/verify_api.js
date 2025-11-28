import express from 'express';
import dataRoutes from './src/routes/data.routes.js';
import axios from 'axios';
import app from './src/app.js'; // Import the main app

async function verify() {
    const port = 3001; // Use a different port for verification
    const server = app.listen(port, async () => {
        console.log(`Verification server running on port ${port}`);

        try {
            console.log('Verifying /api/data/tables...');
            const tablesRes = await axios.get(`http://localhost:${port}/api/data/tables`);

            if (tablesRes.status !== 200) {
                console.error('Failed to fetch tables:', tablesRes.status, tablesRes.data);
                process.exit(1);
            }

            console.log('Tables fetched successfully:', tablesRes.data.tables);

            if (!tablesRes.data.tables || tablesRes.data.tables.length === 0) {
                console.error('No tables returned');
                process.exit(1);
            }

            const firstTable = tablesRes.data.tables[0];
            console.log(`Verifying /api/data/tables/${firstTable}...`);

            const dataRes = await axios.get(`http://localhost:${port}/api/data/tables/${firstTable}`);

            if (dataRes.status !== 200) {
                console.error(`Failed to fetch data for ${firstTable}:`, dataRes.status, dataRes.data);
                process.exit(1);
            }

            console.log(`Data for ${firstTable} fetched successfully. Records: ${dataRes.data.data.length}`);
            console.log('Verification passed!');
        } catch (error) {
            console.error('Verification failed:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            process.exit(1);
        } finally {
            server.close();
        }
    });
}

verify();
