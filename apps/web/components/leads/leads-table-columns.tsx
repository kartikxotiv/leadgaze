'use client';

import React, { useState } from 'react';

import { Edit, Plus, X } from 'lucide-react';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';

import { useColumnResize } from '@kit/ui/use-column-resize';

type SortableTableHeadProps = {
  label: string;
  columnId: string;
  sortColumn?: string;
  sortDirection?: string;
  onSort?: () => void;
  sortable?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
};

function SortableTableHead({ 
  label, 
  columnId, 
  sortColumn, 
  sortDirection, 
  onSort, 
  sortable = true,
  className,
  children,
  ...props 
}: SortableTableHeadProps) {
  const sortState = sortColumn === columnId ? sortDirection : undefined;
  
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${className || ''}`}>
      <div className="flex items-center justify-between">
        <button 
          onClick={onSort}
          disabled={!sortable}
          className={`flex items-center ${!sortable ? 'cursor-default' : 'cursor-pointer hover:text-gray-900'}`}
        >
          <span className="mr-1">{label}</span>
          {sortable && sortColumn === columnId && (
            <span className={`text-gray-400 ${sortDirection === 'desc' ? '' : ''}`}>
              {sortDirection === 'desc' ? '↓' : '↑'}
            </span>
          )}
        </button>
        
        {/* Edit button - only shows on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit className="h-4 w-4 text-gray-400 hover:text-blue-600" />
        </div>
      </div>
      
      {children}
    </th>
  );
}

type ColumnDefinition = {
  id: string;
  label: string;
  type?: string;
};

type LeadsTableColumnsProps = {
  columns: ColumnDefinition[];
  visibility: Record<string, boolean>;
  onToggleVisibility: (columnId: string) => void;
  extraColumns?: ColumnDefinition[];
  getHeaderProps?: (columnId: string) => Record<string, any>;
  getResizeHandleProps?: (columnId: string) => Record<string, any>;
};

export function LeadsTableColumns({ 
  columns, 
  visibility, 
  onToggleVisibility, 
  extraColumns = [],
  getHeaderProps = () => ({}),
  getResizeHandleProps = () => ({})
}: LeadsTableColumnsProps) {
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const allColumns = [...columns, ...extraColumns];

  const handleAddColumn = () => {
    setShowColumnManager(true);
  };

  const handleEditColumn = (columnId: string) => {
    setEditingColumn(columnId);
  };

  return (
    <>
      <thead className="bg-gray-50">
        <tr>
          {allColumns.map((column) => (
            <th
              key={column.id}
              className="group relative px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              {...getHeaderProps(column.id)}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{column.label}</span>
                
                {/* Edit button - only shows on hover */}
                <button
                  onClick={() => handleEditColumn(column.id)}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
                  title="Edit column permissions"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              
              {/* Resize handle - only shows on hover */}
              <div 
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-gray-300"
                {...getResizeHandleProps(column.id)}
              />
            </th>
          ))}

          {/* "+" button for adding new columns */}
          <th className="w-8">
            <button
              onClick={handleAddColumn}
              className="flex h-full w-full items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
              title="Add column"
            >
              <Plus className="h-4 w-4" />
            </button>
          </th>

          {/* Actions column */}
          <th className="sticky-right-header px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>

      {/* Column Management Dialog */}
      <Dialog open={showColumnManager} onOpenChange={setShowColumnManager}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Columns</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-4">
            <Label>Select columns to show/hide</Label>
            
            <div className="space-y-1">
              {allColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between p-3 rounded border bg-white hover:bg-gray-50"
                >
                  <span className="font-medium">{column.label}</span>
                  <button
                    onClick={() => onToggleVisibility(column.id)}
                    className={`flex items-center justify-center rounded border px-2 py-1 text-sm ${
                      visibility[column.id] 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    {visibility[column.id] ? 'Hide' : 'Show'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowColumnManager(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Edit Modal */}
      {editingColumn && (
        <ColumnEditModal
          columnId={editingColumn}
          isOpen={!!editingColumn}
          onClose={() => setEditingColumn(null)}
        />
      )}
    </>
  );
}

function ColumnEditModal({ columnId, isOpen, onClose }: { columnId: string; isOpen: boolean; onClose: () => void }) {
  const [accessType, setAccessType] = useState('public');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Column: {columnId}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Access Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['public', 'private', 'role_based', 'user_based', 'custom'].map((type) => (
                <Button
                  key={type}
                  variant={accessType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAccessType(type)}
                >
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {accessType === 'public' && 'Everyone in the workspace can view this field.'}
              {accessType === 'private' && 'Only workspace owners and super admins can view this field.'}
              {accessType === 'role_based' && 'Access is controlled by role. Select roles below to grant access.'}
              {accessType === 'user_based' && 'Access is controlled by specific users. Select users below to grant access.'}
              {accessType === 'custom' && 'Combination of roles and users.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
