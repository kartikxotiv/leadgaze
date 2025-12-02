import { IdCard } from "lucide-react";
import React from "react";

export default function AddReletedContact() {
  return (
    <>
      <div className="flex bg-[#f3f3f3] justify-between p-2 rounded-[2px] items-center border-b border-[#c9c9c9]">
        <div className="font-semibold text-md flex gap-2 items-center">
          <IdCard className="w-5 h-5 text-[#2563eb]" />
          Contacts
        </div>
        <div className="">
          <button className="border-[#2563eb] text-[#2563eb] text-xs px-3 rounded-[2px] py-1 border">
            New
          </button>
        </div>
      </div>

      <div className="p-2">
        <div className=""> jack Rogerbar</div>
        <div className="">
          <div className="flex gap-4 mt-2">
            <h5 className="text-xs w-28">Title</h5>
            <p className=" text-xs ">Development</p>
          </div>
          <div className="flex gap-4 mt-2">
            <h5 className="text-xs  w-28">Email </h5>
            <p className=" text-xs ">005xyzh@gmail.com</p>
          </div>
          <div className="flex gap-4 mt-2">
            <h5 className="text-xs  w-28">Phone Number</h5>
            <p className=" text-xs ">8015569875</p>
          </div>
          <div className="flex gap-4 mt-2">
            <h5 className="text-xs  w-28">Alternative Number</h5>
            <p className=" text-xs ">2364815987</p>
          </div>
          <div className="flex gap-4 mt-2">
            <h5 className="text-xs  w-28">Alternative Email Id</h5>
            <p className=" text-xs ">005xyzh@gmail.com</p>
          </div>
        </div>
      </div>
    </>
  );
}
