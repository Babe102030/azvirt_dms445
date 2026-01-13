
import axios from 'axios';

async function debugRequest() {
    const url = 'http://localhost:3000/api/trpc/materials.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D';

    console.log(`Requesting: ${url}`);
    try {
        const response = await axios.get(url, {
            validateStatus: () => true,
        });

        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);
        console.log('--- Body Start ---');
        console.log(typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data).substring(0, 500));
        console.log('--- Body End ---');

    } catch (error: any) {
        console.error('Request failed:', error.message);
    }
}

debugRequest();
