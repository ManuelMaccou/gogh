import fetch from 'node-fetch';

export async function validateMessage(messageBytes) {
    const frameValidateUrl = 'https://api.neynar.com/v2/farcaster/frame/validate';

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api_key': process.env.NEYNAR_API_KEY,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            cast_reaction_context: false,
            follow_context: false,
            message_bytes_in_hex: messageBytes
        })
    };

    try {
        const response = await fetch(frameValidateUrl, options);
        const data = await response.json();
        if (data.valid === true) {
            return data;
        } else {
            console.error('Validation failed');
            throw new Error('Validation failed');
        }
    } catch (err) {
        console.error('error:' + err);
        throw new Error('Validation failed');
    }
}

export default validateMessage;
