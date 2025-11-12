/**
 * Example usage of Assignee components
 * 
 * This file demonstrates various ways to use the assignee components
 * throughout the application.
 */

import React from "react";
import {
  AssigneeAvatarGroup,
  AssigneeSelector,
  AssigneeDialog,
  AssigneeInlineEditor,
  type Assignee,
} from "@/components/assignees";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

// ============================================================================
// Example 1: Simple Avatar Display
// ============================================================================
export function SimpleAvatarDisplay() {
  const assignees: Assignee[] = [
    {
      user_id: "1",
      first_name: "Kartik",
      last_name: "Gupta",
      email: "kartik@example.com",
    },
    {
      user_id: "2",
      first_name: "Alice",
      last_name: "Miller",
      email: "alice@example.com",
    },
    {
      user_id: "3",
      first_name: "Bob",
      last_name: "Johnson",
      email: "bob@example.com",
    },
    {
      user_id: "4",
      first_name: "Carol",
      last_name: "Williams",
      email: "carol@example.com",
    },
    {
      user_id: "5",
      first_name: "David",
      last_name: "Brown",
      email: "david@example.com",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Avatar Group - Small</h3>
        <AssigneeAvatarGroup assignees={assignees} size="sm" maxVisible={3} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Avatar Group - Medium</h3>
        <AssigneeAvatarGroup assignees={assignees} size="md" maxVisible={4} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Avatar Group - Large</h3>
        <AssigneeAvatarGroup assignees={assignees} size="lg" maxVisible={5} />
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Table Row with Assignees
// ============================================================================
export function TableRowWithAssignees({ leadId }: { leadId: string }) {
  return (
    <tr>
      <td className="px-4 py-2">Lead Title</td>
      <td className="px-4 py-2">
        <AssigneeInlineEditor leadId={leadId} size="sm" maxVisible={3} />
      </td>
      <td className="px-4 py-2">$5,000</td>
    </tr>
  );
}

// ============================================================================
// Example 3: Card with Assignees
// ============================================================================
export function LeadCard({ leadId, title }: { leadId: string; title: string }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Assignees</span>
        <AssigneeInlineEditor 
          leadId={leadId} 
          size="sm" 
          maxVisible={2}
          onAssigneesUpdated={(assignees) => {
            console.log("Assignees updated:", assignees);
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Custom Trigger Dialog
// ============================================================================
export function CustomTriggerExample({ leadId }: { leadId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Custom Dialog Trigger</h3>
      
      <AssigneeDialog
        leadId={leadId}
        onAssigneesUpdated={(assignees) => {
          console.log("Updated:", assignees);
        }}
        trigger={
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Team Members
          </Button>
        }
      />
    </div>
  );
}

// ============================================================================
// Example 5: Standalone Selector (for forms)
// ============================================================================
export function StandaloneSelectorExample({ leadId }: { leadId: string }) {
  const [selectedAssignees, setSelectedAssignees] = React.useState<Assignee[]>([]);

  const handleSave = () => {
    console.log("Saving assignees:", selectedAssignees);
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-semibold">Standalone Selector</h3>
      
      <AssigneeSelector
        leadId={leadId}
        selectedAssignees={selectedAssignees}
        onAssigneesChange={setSelectedAssignees}
        onSave={handleSave}
      />
    </div>
  );
}

// ============================================================================
// Example 6: Lead Detail View (Similar to Screenshot)
// ============================================================================
export function LeadDetailView({ leadId }: { leadId: string }) {
  return (
    <div className="p-6 border rounded-lg space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Lead Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32">Status</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">
            Pipeline
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32">Priority</span>
          <span className="text-sm">High</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32">Assignees</span>
          <AssigneeInlineEditor 
            leadId={leadId} 
            size="md" 
            maxVisible={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-32">Sprint Points</span>
          <span className="text-sm text-muted-foreground">Empty</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 7: Kanban Card
// ============================================================================
export function KanbanCard({ leadId, title }: { leadId: string; title: string }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm space-y-3">
      <h4 className="font-medium">{title}</h4>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Team</span>
        <AssigneeInlineEditor 
          leadId={leadId} 
          size="sm" 
          maxVisible={3}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Example 8: With Click Handler
// ============================================================================
export function WithClickHandlerExample() {
  const assignees: Assignee[] = [
    {
      user_id: "1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    },
    {
      user_id: "2",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
    },
  ];

  const handleAvatarClick = (assignee: Assignee) => {
    alert(`Clicked on ${assignee.first_name} ${assignee.last_name}`);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Click on Avatars</h3>
      <AssigneeAvatarGroup
        assignees={assignees}
        size="lg"
        onAvatarClick={handleAvatarClick}
      />
    </div>
  );
}

// ============================================================================
// Example 9: Empty State
// ============================================================================
export function EmptyStateExample({ leadId }: { leadId: string }) {
  return (
    <div className="border rounded-lg p-6 text-center space-y-4">
      <p className="text-muted-foreground">No assignees yet</p>
      <AssigneeDialog
        leadId={leadId}
        trigger={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Team Members
          </Button>
        }
      />
    </div>
  );
}

// ============================================================================
// Example 10: Responsive Layout
// ============================================================================
export function ResponsiveExample({ leadId }: { leadId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold">Lead Information</h3>
          <p className="text-sm text-muted-foreground">Manage your team assignments</p>
        </div>
        <AssigneeInlineEditor 
          leadId={leadId} 
          size="md" 
          maxVisible={3}
        />
      </div>
    </div>
  );
}

