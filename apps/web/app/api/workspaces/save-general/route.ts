import { NextRequest } from 'next/server';
import { saveWorkspaceGeneralSettings } from './controller';

export async function POST(request: NextRequest) {
  return saveWorkspaceGeneralSettings({ request });
}
