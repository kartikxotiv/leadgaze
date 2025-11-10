import React from "react";

import DataTable from 'react-data-table-component';
const customStyles: any = {


    table: {


   
      style: {
        whiteSpace: "nowrap",
        wordBreak: "break-word",
        textAlign: "left",
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
        // border: "1px solid  red",
        backgroundColor: "#FFFFFF",
        boxShadow: "0px 1px 8px rgba(16, 24, 40, 0.10)",
        fontFamily: "'Satoshi_Regular', 'Zoho_Puvi_SemiBold', Arial, sans-serif",
        fontSize: "14px",
        color: "#101828",
        letterSpacing: "0.5px",

      },
    },
    linkText: {
      color: "#155EEF",
      fontWeight: 400,
      textDecoration: "none",
    },
    uppercaseText: {
      textTransform: "uppercase",
      fontWeight: 500,
    },
    rows: {
      style: {
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minHeight: "35px", // Decreased from default 33px
        height: "35px", // Set fixed height
        "&:hover": {
          backgroundColor: "#F9FAFB !important",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        },
        borderBottom: "1px solid #F2F4F7",
      },
    },
    headRow: {
      style: {
        background: "#f8fafc",
        borderBottom: "1px solid #EAECF0",
        fontFamily: "'Satoshi_Regular', 'Zoho_Puvi_SemiBold', Arial, sans-serif",
        fontSize: "12px",
        minHeight: "40px",
        position: "sticky",
        top: 0,
        zIndex: 8,
      },
    },
    headCells: {
      style: {
        // borderRight: "1px solid #64748b4d",
        color: "#6C7A99",
        fontSize: "12px",
        fontWeight: 600,
        textAlign: "left",
        letterSpacing: "0.5px",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#E5E7EB",
        },
      },
    },
    cells: {
      style: {
        // borderRight: "1px solid #64748b4d",
        fontSize: "13px",
        color: "#000000",
        maxHeight: "35px", 
        textAlign: "left",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        paddingTop: "4px", 
        paddingBottom: "4px",
        paddingLeft: "16px", 
        paddingRight: "16px",
        cursor: "pointer",
        borderBottom: "none",
        transition: "all 0.2s ease",
      
        "&:hover": {
          backgroundColor: "#F9FAFB",
        },
        h6: {
          whiteSpace: "normal",
          margin: 0,
        },
      },
    },
    // Additional cell styling options
    cellRow: {
      
      style: {
        
        fontSize: "13px",
        color: "#374151",
        padding: "4px 8px", // Reduced padding
        borderBottom: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        minHeight: "35px", // Match row height
        height: "25px", // Set fixed height
        transition: "background-color 0.2s ease",
        "&:hover": {
          backgroundColor: "#F3F4F6",
        },
        "&:nth-child(even)": {
          backgroundColor: "#FAFAFA",
        },
      },
    },
    // Conditional row styling
    conditionalRowStyles: [
      {
        when: (row: any) => row.status === 'active',
        style: {
          backgroundColor: '#F0FDF4',
          color: '#166534',
        },
      },
      {
        when: (row: any) => row.status === 'inactive',
        style: {
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
        },
      },
    ],
    pagination: {
      pagination: {
        style: {
          borderTop: "none !important",
          borderTopWidth: "0px !important",
          justifyContent: "center",
        },
        pageButtonsStyle: {
          borderRadius: "5px",
          cursor: "pointer",
          padding: "5px 10px",
          margin: "0 4px",
          fontSize: "14px",
          color: "#fff",
          backgroundColor: "#f97316",
          "&:disabled": {
            cursor: "not-allowed",
            opacity: 0.5,
          },
          "&:hover:not(:disabled)": {
            backgroundColor: "#ea580c",
          },
        },
      },
      rdt_Pagination: {
        style: {
          borderTop: "none !important",
          borderTopWidth: "0px !important",
          justifyContent: "center",
        },
      },
    },
  };
interface UserData {
    id: number;
    name: string;
    emailid: string;
    phone: string;
}

interface ReactTableProps {
    columns: any;
    data: any;
    pagination?: boolean;
    paginationTotalRows?: number;
    paginationPerPage?: number;
    paginationDefaultPage?: number;
    onChangePage?: (page: number) => void;
    onChangeRowsPerPage?: (currentRowsPerPage: number, currentPage: number) => void;
    onRowClicked?: (row: any) => void;
}

export const ReactTable = ({
    columns, 
    data,
    pagination = false,
    paginationTotalRows,
    paginationPerPage = 20,
    paginationDefaultPage = 1,
    onChangePage,
    onChangeRowsPerPage,
    onRowClicked,
}: ReactTableProps) => {
    console.log("columns", columns);
    console.log("data", data);
    
    return (
       <>
       
       <DataTable
        columns={columns}
        data={data}
        pagination={pagination}
        paginationTotalRows={paginationTotalRows}
        paginationPerPage={paginationPerPage}
        paginationDefaultPage={paginationDefaultPage}
        onChangePage={onChangePage}
        onChangeRowsPerPage={onChangeRowsPerPage}
        paginationServer={pagination}
        onRowClicked={onRowClicked}
        customStyles={customStyles}
        conditionalRowStyles={customStyles.conditionalRowStyles}
        
        />
       
       </>
    )
}