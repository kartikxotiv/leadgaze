"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ReactTable } from "@/components/reuseableComponent/ReactTable";




export default function TestTablePage() {

    const columns = [
        { name: 'Name', selector: (row: any) => row.name, sortable: true },
        { name: 'Email ID', selector: (row: any) => row.emailid, sortable: true },
        { name: 'Phone Number', selector: (row: any) => row.phone, sortable: true },
    ];
    
    const data = [
        { id: 1, name: 'Alice', emailid: 'alice@mail.com', phone: '9876543210' },
        { id: 2, name: 'Bob', emailid: 'bob@mail.com', phone: '9123456789' },
        { id: 3, name: 'Charlie', emailid: 'charlie@mail.com', phone: '9234567890' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Test Table Page</h1>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <ReactTable columns={columns} data={data}    />
                </div>
                
            </div>
        </DashboardLayout>
    );

    
}