import { useQuery } from "@tanstack/react-query";
import React from "react";
// import { fetchBusiness } from "@/lib/api/business";

export default function AccountInformation({
  account,
  business,
}: {
  account: any;
  business: any;
}) {
  //   const { data: business } = useQuery({
  //     queryKey: ["business", account.business_id],
  //     queryFn: () => fetchBusiness(account.business_id!),
  //   });
  return (
    <div className="mt-4 space-y-6">
      {/* Account Information */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Account Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">
              First Name
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {account.first_name || "N/A"}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              Last Name
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {account.last_name || "N/A"}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <p className="text-sm text-gray-900 mt-1">
              {account.email || "N/A"}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              Phone Number
            </label>
            <p className="text-sm text-gray-900 mt-1">
              {account.phone_number || "N/A"}
            </p>
          </div>
          {account.alternative_email && (
            <div>
              <label className="text-xs font-medium text-gray-500">
                Alternative Email
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {account.alternative_email}
              </p>
            </div>
          )}
          {account.alternative_phone_number && (
            <div>
              <label className="text-xs font-medium text-gray-500">
                Alternative Phone
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {account.alternative_phone_number}
              </p>
            </div>
          )}
          {account.linkedin_url && (
            <div>
              <label className="text-xs font-medium text-gray-500">
                LinkedIn URL
              </label>
              <p className="text-sm text-gray-900 mt-1">
                <a
                  href={account.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {account.linkedin_url}
                </a>
              </p>
            </div>
          )}
          {account.location && (
            <div>
              <label className="text-xs font-medium text-gray-500">
                Location
              </label>
              <p className="text-sm text-gray-900 mt-1">{account.location}</p>
            </div>
          )}
          {account.contact_time_zone && (
            <div>
              <label className="text-xs font-medium text-gray-500">
                Time Zone
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {account.contact_time_zone}
              </p>
            </div>
          )}
          {account.comment && (
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">
                Notes/Comment
              </label>
              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {account.comment}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Business Details */}
      {business && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Business Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">
                Business Name
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {business.business_name || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                Business Type
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {business.business_type || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                Industry
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {business.industry || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                Business Size
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {business.business_size || "N/A"}
              </p>
            </div>
            {business.website && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Website
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {business.website}
                  </a>
                </p>
              </div>
            )}
            {business.business_contact && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Business Contact
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {business.business_contact}
                </p>
              </div>
            )}
            {business.business_country && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Country
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {business.business_country}
                </p>
              </div>
            )}
            {business.business_address && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Address
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {business.business_address}
                </p>
              </div>
            )}
            {business.description && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500">
                  Description
                </label>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                  {business.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
