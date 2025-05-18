import { theme } from "../utils/theme";

export interface Branch {
  id: string;
  branch_id: string;
  name: string;
  location: string;
  governorate: string;
  status: "active" | "inactive";
  tax_rate: number;
}

export interface BranchFormData {
  branch_id: string;
  name: string;
  location: string;
  governorate: string;
  status: "active" | "inactive";
  tax_rate: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getBranches(): Promise<Branch[]> {
  try {
    const response = await fetch(`${API_URL}/branches/`);
    if (!response.ok) throw new Error("Failed to fetch branches");
    const data = await response.json();
    return data.branches || [];
  } catch (error) {
    console.error("Error fetching branches:", error);
    throw error;
  }
}

export async function addBranch(data: BranchFormData): Promise<Branch> {
  try {
    const response = await fetch(`${API_URL}/branches/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to add branch");
    return await response.json();
  } catch (error) {
    console.error("Error adding branch:", error);
    throw error;
  }
}

export async function updateBranch(id: string, data: BranchFormData): Promise<Branch> {
  try {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update branch");
    return await response.json();
  } catch (error) {
    console.error("Error updating branch:", error);
    throw error;
  }
}

export async function deleteBranch(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/branches/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete branch");
  } catch (error) {
    console.error("Error deleting branch:", error);
    throw error;
  }
}

// قائمة المحافظات السورية
export const SYRIAN_GOVERNORATES = [
  "دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "الرقة",
  "دير الزور",
  "الحسكة",
  "إدلب",
  "درعا",
  "السويداء",
  "القنيطرة",
  "ريف دمشق",
]; 