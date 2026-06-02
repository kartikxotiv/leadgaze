import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import {
    deleteDocumentController,
    updateDocumentController,
} from '../controller';

const DocumentUpdateSchema = z.object({
    name: z.string().min(2).max(150).optional(),
    employeeId: z.string().uuid().optional(),
    uploadFile: z.string().optional(),
    organizationId: z.string().uuid().optional(),
});

export const PATCH = enhanceRouteHandler(updateDocumentController, {
    schema: DocumentUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteDocumentController);
