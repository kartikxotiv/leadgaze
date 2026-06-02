import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
    createDocumentController,
    listDocumentsController,
} from './controller';

const DocumentCreateSchema = z.object({
    name: z.string().min(2).max(150),
    employeeId: z.string().uuid(),
    uploadFile: z.string(),
});

export const GET = enhanceRouteHandler(listDocumentsController);

export const POST = enhanceRouteHandler(createDocumentController, {
    schema: DocumentCreateSchema,
});
