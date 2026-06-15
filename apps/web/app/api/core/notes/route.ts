import { createNoteController, deleteNoteController, getNotesController, updateNoteController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getNotesController, { auth: false });
export const POST = enhanceRouteHandler(createNoteController, { auth: false });
export const PATCH = enhanceRouteHandler(updateNoteController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteNoteController, { auth: false });
