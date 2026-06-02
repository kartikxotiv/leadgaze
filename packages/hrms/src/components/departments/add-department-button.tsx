'use client';

import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';

type AddDepartmentButtonProps = {
  onClick?: () => void;
};

export function AddDepartmentButton(props: AddDepartmentButtonProps) {
  return (
    <Button size={'sm'} className={'w-full sm:w-auto'} onClick={props.onClick}>
      <Plus className={'mr-1.5 h-3.5 w-3.5'} />
      Add Department
    </Button>
  );
}
