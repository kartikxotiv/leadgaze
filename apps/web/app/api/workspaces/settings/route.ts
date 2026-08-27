import { NextRequest } from 'next/server';
import { getWorkspaceSettings } from './controller';

export async function GET(request: NextRequest) {
  return getWorkspaceSettings({ request });
}
