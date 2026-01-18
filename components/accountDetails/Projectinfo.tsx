"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  Target,
  DollarSign,
} from "lucide-react";

export default function Projectinfo() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    projectType: "",
    projectGoal: "",
    branding: "",
    designStyle: "",
    references: "",
    pages: "",
    preferredTech: "",
    features: [] as string[],
    specialFeatures: "",
    hosting: "",
    contentProvidedBy: "",
    timeline: "",
    price: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter((f) => f !== value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form data:", form);
  };

  return (
    <>
      <>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={form.projectType}
                onValueChange={(value) =>
                  handleSelectChange("projectType", value)
                }
              >
                <SelectTrigger className="bg-gray-100">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customapp">Custom App</SelectItem>
                  <SelectItem value="mobile-app">Mobile App</SelectItem>
                  <SelectItem value="Zoho">Zoho</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="cloud-and-devops">
                    Cloud and Devops
                  </SelectItem>
                  <SelectItem value="aiml">Aiml</SelectItem>
                  <SelectItem value="ecommerce">Ecommerce</SelectItem>
                  <SelectItem value="erp">CRM / ERP</SelectItem>
                  <SelectItem value="saas-product">SaaS Product</SelectItem>
                  <SelectItem value="ai-chatbot">Ai Chatbot</SelectItem>
                  <SelectItem value="Seo">Seo</SelectItem>
                  <SelectItem value="google-ads-meta-ads">
                    Google ads & Meta ads
                  </SelectItem>
                  <SelectItem value="admin-panel">
                    Web Design and Development
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Estimated Timeline</Label>
              <Select
                value={form.timeline}
                onValueChange={(value) => handleSelectChange("timeline", value)}
              >
                <SelectTrigger className="bg-gray-100">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2-weeks">1–2 weeks</SelectItem>
                  <SelectItem value="2-4-weeks">2–4 weeks</SelectItem>
                  <SelectItem value="1-2-months">1–2 months</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price">Estimated Cost Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="price"
                  min={0}
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={handleChange}
                  className="pl-10 bg-gray-100"
                  placeholder="Enter price"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialFeatures">Custom Features</Label>
            <Textarea
              id="specialFeatures"
              name="specialFeatures"
              value={form.specialFeatures}
              onChange={handleChange}
              className="bg-gray-100"
              rows={3}
              placeholder="Describe any special requirement"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-md hover:bg-[#1d4ed8]"
            >
              Submit
            </button>
          </div>
        </form>
      </>
    </>
  );
}
