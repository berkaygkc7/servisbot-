import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
    try {
        const { tokens, title, body } = await req.json();

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ error: 'No tokens provided' }), { status: 400 });
        }

        // Build Expo push messages
        const messages = tokens.map((token: string) => ({
            to: token,
            sound: 'default',
            title,
            body,
            channelId: 'default',
        }));

        // Send to Expo Push API
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
});
