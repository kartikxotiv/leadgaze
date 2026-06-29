'use client';

import Link from 'next/link';

import { Eye, MoreVertical, Trash2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

interface EntityActionsDropdownProps {
  id: string;
  viewPath: string;
  canDelete: boolean;
  onDelete: () => void;
}

export function EntityActionsDropdown({
  viewPath,
  canDelete,
  onDelete,
}: EntityActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={viewPath} className="flex cursor-pointer items-center">
            <Eye className="text-muted-foreground mr-2 h-4 w-4" />
            <span>View</span>
          </Link>
        </DropdownMenuItem>

        {canDelete && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
