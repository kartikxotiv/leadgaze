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
        border: "1px solid #EAECF0",
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
        "&:hover": {
          backgroundColor: "#F9FAFB !important",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        },
        borderBottom: "1px solid #F2F4F7",
      },
    },
    headRow: {
      style: {
        background: "#F2F4F7",
        borderBottom: "1px solid #EAECF0",
        fontFamily: "'Satoshi_Regular', 'Zoho_Puvi_SemiBold', Arial, sans-serif",
        fontSize: "12px",
      },
    },
    headCells: {
      style: {
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
        fontSize: "13px",
        color: "#000000",
        maxheight: "50px",
        textAlign: "left",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        paddingTop: "8px",
        paddingBottom: "8px",
        cursor: "pointer",
        h6: {
          whiteSpace: "normal",
          margin: 0,
        },
      },
    },
    pagination: {
      pagination: {
        style: {
          borderTop: "1px solid #e5e7eb",
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
    },
  };
interface UserData {
    id: number;
    name: string;
    emailid: string;
    phone: string;
}

export const ReactTable = ({columns, data}: {columns: any, data: any}) => {
    return (
       <>
       
       <DataTable
        title="User List"
        columns={columns}
        data={data}
        pagination
        customStyles={customStyles}
        />
       
       </>
    )
}