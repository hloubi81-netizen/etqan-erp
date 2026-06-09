import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WIX_CONNECTOR_ID = "6a28780b122f1605de605504";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            // Attempt to get the connection for the current app user
            const connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(WIX_CONNECTOR_ID);
            
            // If connection exists and has token, user is connected
            return Response.json({ connected: !!connection?.accessToken });
        } catch (e) {
            // If function throws, user is not connected
            return Response.json({ connected: false });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});