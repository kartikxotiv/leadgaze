import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface CallLog {
    id: string;
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    subject: string;
    call_type: 'inbound' | 'outbound';
    status: 'completed' | 'missed' | 'no_answer' | 'voicemail' | 'busy' | 'failed';
    contact_name?: string;
    date_time: string;
    comments?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at?: string;
    created_by_user?: {
        name: string;
        email: string;
    };
    created_by_name?: string;
}

export interface CreateCallPayload {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    subject: string;
    call_type: string;
    status: string;
    contact_name?: string;
    date_time: string;
    comments?: string;
}

export interface UpdateCallPayload {
    subject?: string;
    call_type?: string;
    status?: string;
    contact_name?: string;
    date_time?: string;
    comments?: string;
}

const getCallsService = asyncHandlerClient(
    async (params: {
        workspaceId: string;
        entityType?: string;
        entityId?: string;
    }) => {
        const { workspaceId, entityType, entityId } = params;
        let url = `/calls?workspaceId=${workspaceId}`;
        if (entityType && entityId) {
            url += `&entityType=${entityType}&entityId=${entityId}`;
        }

        const response = await ApiClient.get(url);
        // API returns { message, data } structure
        return response.data?.data || [];
    },
);

const createCallService = asyncHandlerClient(
    async (payload: CreateCallPayload) => {
        const response = await ApiClient.post('/calls', payload);
        return response.data?.data;
    },
);

const updateCallService = asyncHandlerClient(
    async (callId: string, payload: UpdateCallPayload) => {
        const response = await ApiClient.patch(`/calls/${callId}`, payload);
        return response.data?.data;
    },
);

const deleteCallService = asyncHandlerClient(async (callId: string) => {
    const response = await ApiClient.delete(`/calls/${callId}`);
    return response.data?.data;
});

export {
    getCallsService,
    createCallService,
    updateCallService,
    deleteCallService,
};
