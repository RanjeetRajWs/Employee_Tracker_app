import React, { useState, useEffect } from "react";
import { 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  Globe, 
  Plus, 
  Save, 
  X,
  CheckCircle,
  ChevronDown,
  Trash2,
  FileText,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { getAdminProfile, updateAdminProfile } from "../../services/api";

export default function UserProfile() {
  const { admin: initialUser, notify } = useAdmin();
  const [activeTab, setActiveTab] = useState("Basic Info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openMenus, setOpenMenus] = useState({ "Personal": true, "Documents": false, "My Finance": false });

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    
    // Employment
    companyName: "",
    legalEntity: "",
    employeeId: "",
    uniqueId: "",
    joinDate: "",
    department: "",
    designation: "",
    ledgerCode: "",
    
    // Personal
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    bloodGroup: "",
    placeOfBirth: "",
    displayName: "",
    nationality: "",
    physicallyHandicapped: false,
    
    // Complex Objects / Arrays
    knownLanguages: [],
    familyDetails: [],
    education: [],
    previousEmployment: [],
    documents: [],
    
    // Nested Objects
    currentAddress: { street: "", city: "", state: "", zipCode: "", country: "" },
    permanentAddress: { street: "", city: "", state: "", zipCode: "", country: "" },
    emergencyContact: { name: "", relation: "", phone: "", address: "" },
    socialLinks: { linkedin: "", twitter: "", github: "", portfolio: "" },
    bankDetails: {
        bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "",
        panNumber: "", aadhaarNumber: "", pfAccountNumber: "", uanNumber: ""
    }
  });

  const sidebarItems = [
    { label: "Personal", icon: User, hasSub: true, 
      subItems: [
        { label: "Basic Info" },
        { label: "Family Info" },
        { label: "Contact & Social Links" },
        { label: "Address" },
        { label: "Education" },
        { label: "Previous Employer" },
      ]
    },
    { label: "Emergency Contact", icon: Phone },
    { label: "Documents", icon: FileText, hasSub: true,
      subItems: [
        { label: "All Documents" },
      ]
    },
    { label: "Profile Update Requests", icon: User },
    { label: "My Profile Completion", icon: CheckCircle },
    { label: "My Finance", icon: CreditCard, hasSub: true,
       subItems: [
        { label: "Bank Details" },
      ]
    },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getAdminProfile();
      if (response.data?.success) {
        const user = response.data.data.admin;
        
        const formatDate = (dateString) => {
            if (!dateString) return "";
            try { return new Date(dateString).toISOString().split('T')[0]; } catch (e) { return ""; }
        };

        // Deep merge logic or explicit assignment
        setFormData({
            ...user,
            joinDate: formatDate(user.joinDate),
            dateOfBirth: formatDate(user.dateOfBirth),
            
            // Ensure nested objects exist
            currentAddress: user.currentAddress || { street: "", city: "", state: "", zipCode: "", country: "" },
            permanentAddress: user.permanentAddress || { street: "", city: "", state: "", zipCode: "", country: "" },
            emergencyContact: user.emergencyContact || { name: "", relation: "", phone: "", address: "" },
            socialLinks: user.socialLinks || { linkedin: "", twitter: "", github: "", portfolio: "" },
            bankDetails: user.bankDetails || {
                bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "",
                panNumber: "", aadhaarNumber: "", pfAccountNumber: "", uanNumber: ""
            },
            
            // Format array dates
            familyDetails: (user.familyDetails || []).map(f => ({ ...f, dateOfBirth: formatDate(f.dateOfBirth) })),
            education: (user.education || []).map(e => ({ ...e, startDate: formatDate(e.startDate), endDate: formatDate(e.endDate) })),
            previousEmployment: (user.previousEmployment || []).map(p => ({ ...p, startDate: formatDate(p.startDate), endDate: formatDate(p.endDate) })),
            
            knownLanguages: user.knownLanguages || []
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parentField, field, value) => {
    setFormData(prev => ({
        ...prev,
        [parentField]: {
            ...prev[parentField],
            [field]: value
        }
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => {
        const newArray = [...prev[arrayName]];
        newArray[index] = { ...newArray[index], [field]: value };
        return { ...prev, [arrayName]: newArray };
    });
  };

  const addItemToArray = (arrayName, emptyItem) => {
    setFormData(prev => ({
        ...prev,
        [arrayName]: [...prev[arrayName], emptyItem]
    }));
  };

  const removeItemFromArray = (arrayName, index) => {
    setFormData(prev => ({
        ...prev,
        [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateAdminProfile(formData);
      if (response.data?.success) {
        notify("Profile updated successfully!", "success");
        fetchProfile(); // Refresh data ensures clean state
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      notify("Failed to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // --- Render Functions for Content Sections ---

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormGroup label="Company Name" value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} />
        <FormGroup label="Legal Entity" value={formData.legalEntity} onChange={(e) => handleChange("legalEntity", e.target.value)} />
        <FormGroup label="Employee ID" value={formData.employeeId} onChange={(e) => handleChange("employeeId", e.target.value)} />
        <FormGroup label="Unique ID" value={formData.uniqueId} onChange={(e) => handleChange("uniqueId", e.target.value)} />
        <FormGroup label="Joining Date" type="date" value={formData.joinDate} onChange={(e) => handleChange("joinDate", e.target.value)} />
        <FormGroup label="First Name" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
        <FormGroup label="Middle Name" value={formData.middleName} onChange={(e) => handleChange("middleName", e.target.value)} />
        <FormGroup label="Last Name" value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
        <FormGroup label="Date Of Birth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} />
        <FormGroup label="Gender" type="select" value={formData.gender} onChange={(e) => handleChange("gender", e.target.value)} options={["Male", "Female", "Other"]} />
        <FormGroup label="Marital Status" type="select" value={formData.maritalStatus} onChange={(e) => handleChange("maritalStatus", e.target.value)} options={["Single", "Married", "Divorced", "Widowed"]} />
        <FormGroup label="Blood Group" value={formData.bloodGroup} onChange={(e) => handleChange("bloodGroup", e.target.value)} />
        <FormGroup label="Nationality" value={formData.nationality} onChange={(e) => handleChange("nationality", e.target.value)} />
        <FormGroup label="Display Name" value={formData.displayName} onChange={(e) => handleChange("displayName", e.target.value)} />
        
        <div className="md:col-span-3 flex items-center gap-3 mt-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Handicap Employees</span>
            <div onClick={() => handleChange("physicallyHandicapped", !formData.physicallyHandicapped)} className={`w-12 h-6 rounded-full relative p-1 shadow-inner cursor-pointer transition-colors ${formData.physicallyHandicapped ? 'bg-blue-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.physicallyHandicapped ? 'translate-x-6' : ''}`}></div>
            </div>
        </div>
    </div>
  );

  const renderFamilyInfo = () => (
    <div className="space-y-6">
        {formData.familyDetails.map((member, idx) => (
            <div key={idx} className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 relative group">
                <button onClick={() => removeItemFromArray("familyDetails", idx)} className="absolute top-2 right-2 p-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormGroup label="Name" value={member.name} onChange={(e) => handleArrayChange("familyDetails", idx, "name", e.target.value)} />
                    <FormGroup label="Relationship" value={member.relationship} onChange={(e) => handleArrayChange("familyDetails", idx, "relationship", e.target.value)} />
                    <FormGroup label="Date of Birth" type="date" value={member.dateOfBirth} onChange={(e) => handleArrayChange("familyDetails", idx, "dateOfBirth", e.target.value)} />
                    <FormGroup label="Occupation" value={member.occupation} onChange={(e) => handleArrayChange("familyDetails", idx, "occupation", e.target.value)} />
                    <FormGroup label="Phone" value={member.phone} onChange={(e) => handleArrayChange("familyDetails", idx, "phone", e.target.value)} />
                </div>
            </div>
        ))}
        <button onClick={() => addItemToArray("familyDetails", { name: "", relationship: "", dateOfBirth: "", occupation: "", phone: "" })} className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest hover:text-blue-600">
            <Plus size={16} /> Add Family Member
        </button>
    </div>
  );

  const renderContactSocial = () => (
    <div className="space-y-8">
        <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Contact Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Personal Email" value={formData.personalEmail || formData.email} onChange={(e) => handleChange("personalEmail", e.target.value)} />
                <FormGroup label="Phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                <FormGroup label="Alt Phone" value={formData.altPhone} onChange={(e) => handleChange("altPhone", e.target.value)} />
            </div>
        </div>
        <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Social Links</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="LinkedIn" value={formData.socialLinks.linkedin} onChange={(e) => handleNestedChange("socialLinks", "linkedin", e.target.value)} icon={<Globe size={14} />} />
                <FormGroup label="Twitter" value={formData.socialLinks.twitter} onChange={(e) => handleNestedChange("socialLinks", "twitter", e.target.value)} icon={<Globe size={14} />} />
                <FormGroup label="GitHub" value={formData.socialLinks.github} onChange={(e) => handleNestedChange("socialLinks", "github", e.target.value)} icon={<Globe size={14} />} />
                <FormGroup label="Portfolio" value={formData.socialLinks.portfolio} onChange={(e) => handleNestedChange("socialLinks", "portfolio", e.target.value)} icon={<Globe size={14} />} />
            </div>
        </div>
    </div>
  );

  const renderAddress = () => (
    <div className="space-y-8">
        <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Current Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Street" value={formData.currentAddress.street} onChange={(e) => handleNestedChange("currentAddress", "street", e.target.value)} />
                <FormGroup label="City" value={formData.currentAddress.city} onChange={(e) => handleNestedChange("currentAddress", "city", e.target.value)} />
                <FormGroup label="State" value={formData.currentAddress.state} onChange={(e) => handleNestedChange("currentAddress", "state", e.target.value)} />
                <FormGroup label="Zip Code" value={formData.currentAddress.zipCode} onChange={(e) => handleNestedChange("currentAddress", "zipCode", e.target.value)} />
                <FormGroup label="Country" value={formData.currentAddress.country} onChange={(e) => handleNestedChange("currentAddress", "country", e.target.value)} />
            </div>
        </div>
        <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Permanent Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup label="Street" value={formData.permanentAddress.street} onChange={(e) => handleNestedChange("permanentAddress", "street", e.target.value)} />
                <FormGroup label="City" value={formData.permanentAddress.city} onChange={(e) => handleNestedChange("permanentAddress", "city", e.target.value)} />
                <FormGroup label="State" value={formData.permanentAddress.state} onChange={(e) => handleNestedChange("permanentAddress", "state", e.target.value)} />
                <FormGroup label="Zip Code" value={formData.permanentAddress.zipCode} onChange={(e) => handleNestedChange("permanentAddress", "zipCode", e.target.value)} />
                <FormGroup label="Country" value={formData.permanentAddress.country} onChange={(e) => handleNestedChange("permanentAddress", "country", e.target.value)} />
            </div>
        </div>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-6">
        {formData.education.map((edu, idx) => (
            <div key={idx} className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 relative group">
                <button onClick={() => removeItemFromArray("education", idx)} className="absolute top-2 right-2 p-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormGroup label="Institute" value={edu.institute} onChange={(e) => handleArrayChange("education", idx, "institute", e.target.value)} />
                    <FormGroup label="Degree" value={edu.degree} onChange={(e) => handleArrayChange("education", idx, "degree", e.target.value)} />
                    <FormGroup label="Specialization" value={edu.specialization} onChange={(e) => handleArrayChange("education", idx, "specialization", e.target.value)} />
                    <FormGroup label="Grade/Percentage" value={edu.grade} onChange={(e) => handleArrayChange("education", idx, "grade", e.target.value)} />
                    <FormGroup label="Start Date" type="date" value={edu.startDate} onChange={(e) => handleArrayChange("education", idx, "startDate", e.target.value)} />
                    <FormGroup label="End Date" type="date" value={edu.endDate} onChange={(e) => handleArrayChange("education", idx, "endDate", e.target.value)} />
                </div>
            </div>
        ))}
        <button onClick={() => addItemToArray("education", { institute: "", degree: "", specialization: "", startDate: "", endDate: "", grade: "" })} className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest hover:text-blue-600">
            <Plus size={16} /> Add Education
        </button>
    </div>
  );

  const renderPreviousEmployment = () => (
    <div className="space-y-6">
        {formData.previousEmployment.map((job, idx) => (
            <div key={idx} className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 relative group">
                <button onClick={() => removeItemFromArray("previousEmployment", idx)} className="absolute top-2 right-2 p-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormGroup label="Company Name" value={job.companyName} onChange={(e) => handleArrayChange("previousEmployment", idx, "companyName", e.target.value)} />
                    <FormGroup label="Designation" value={job.designation} onChange={(e) => handleArrayChange("previousEmployment", idx, "designation", e.target.value)} />
                    <FormGroup label="Location" value={job.location} onChange={(e) => handleArrayChange("previousEmployment", idx, "location", e.target.value)} />
                    <FormGroup label="Reason For Leaving" value={job.reasonForLeaving} onChange={(e) => handleArrayChange("previousEmployment", idx, "reasonForLeaving", e.target.value)} />
                    <FormGroup label="Start Date" type="date" value={job.startDate} onChange={(e) => handleArrayChange("previousEmployment", idx, "startDate", e.target.value)} />
                    <FormGroup label="End Date" type="date" value={job.endDate} onChange={(e) => handleArrayChange("previousEmployment", idx, "endDate", e.target.value)} />
                </div>
            </div>
        ))}
        <button onClick={() => addItemToArray("previousEmployment", { companyName: "", designation: "", startDate: "", endDate: "", reasonForLeaving: "", location: "" })} className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest hover:text-blue-600">
            <Plus size={16} /> Add Employment History
        </button>
    </div>
  );

  const renderEmergencyContact = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormGroup label="Name" value={formData.emergencyContact.name} onChange={(e) => handleNestedChange("emergencyContact", "name", e.target.value)} />
        <FormGroup label="Relationship" value={formData.emergencyContact.relation} onChange={(e) => handleNestedChange("emergencyContact", "relation", e.target.value)} />
        <FormGroup label="Phone" value={formData.emergencyContact.phone} onChange={(e) => handleNestedChange("emergencyContact", "phone", e.target.value)} />
        <FormGroup label="Address" value={formData.emergencyContact.address} onChange={(e) => handleNestedChange("emergencyContact", "address", e.target.value)} />
    </div>
  );
  
  const renderFinance = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormGroup label="Bank Name" value={formData.bankDetails.bankName} onChange={(e) => handleNestedChange("bankDetails", "bankName", e.target.value)} />
          <FormGroup label="Account Holder Name" value={formData.bankDetails.accountHolderName} onChange={(e) => handleNestedChange("bankDetails", "accountHolderName", e.target.value)} />
          <FormGroup label="Account Number" value={formData.bankDetails.accountNumber} onChange={(e) => handleNestedChange("bankDetails", "accountNumber", e.target.value)} />
          <FormGroup label="IFSC Code" value={formData.bankDetails.ifscCode} onChange={(e) => handleNestedChange("bankDetails", "ifscCode", e.target.value)} />
          <FormGroup label="PAN Number" value={formData.bankDetails.panNumber} onChange={(e) => handleNestedChange("bankDetails", "panNumber", e.target.value)} />
          <FormGroup label="Aadhaar Number" value={formData.bankDetails.aadhaarNumber} onChange={(e) => handleNestedChange("bankDetails", "aadhaarNumber", e.target.value)} />
          <FormGroup label="PF Account Number" value={formData.bankDetails.pfAccountNumber} onChange={(e) => handleNestedChange("bankDetails", "pfAccountNumber", e.target.value)} />
          <FormGroup label="UAN Number" value={formData.bankDetails.uanNumber} onChange={(e) => handleNestedChange("bankDetails", "uanNumber", e.target.value)} />
      </div>
  );

  const renderContent = () => {
    switch(activeTab) {
        case "Basic Info": return renderBasicInfo();
        case "Family Info": return renderFamilyInfo();
        case "Contact & Social Links": return renderContactSocial();
        case "Address": return renderAddress();
        case "Education": return renderEducation();
        case "Previous Employer": return renderPreviousEmployment();
        case "Emergency Contact": return renderEmergencyContact();
        case "Bank Details": case "My Finance": return renderFinance();
        case "All Documents": case "Documents":
            return <div className="text-center p-10 text-slate-400">Document management coming soon</div>;
        case "Profile Update Requests":
            return <div className="text-center p-10 text-slate-400">No pending update requests</div>;
        default: return renderBasicInfo();
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-[1440px] mx-auto p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-blue-500 uppercase italic tracking-tight">My Profile</h1>
          <div className="flex items-center gap-6 text-slate-400">
            <div className="flex items-center gap-2"><Mail size={14} /><span className="text-xs font-medium">{formData.email || initialUser?.email}</span></div>
            <div className="flex items-center gap-2"><Phone size={14} /><span className="text-xs font-medium">{formData.phone || "No Phone"}</span></div>
            <div className="flex items-center gap-2"><User size={14} /><span className="text-xs font-medium">{formData.username || "User"}</span></div>
            {formData.joinDate && (<div className="flex items-center gap-2"><Calendar size={14} /><span className="text-xs font-medium">Joined: {formData.joinDate}</span></div>)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-premium border border-white dark:border-slate-700 text-center">
              <div className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-slate-100 mb-4 shadow-lg">
                {initialUser?.avatar ? (<img src={initialUser.avatar} alt={initialUser.username} className="w-full h-full object-cover" />) : 
                (<div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600"><User size={40} /></div>)}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight italic">{formData.displayName || formData.username || "User"}</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{formData.designation || "Employee"}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-premium border border-white dark:border-slate-700">
              <div className="p-4 space-y-1">
                {sidebarItems.map((item, i) => (
                  <div key={i}>
                    <button
                        onClick={() => item.hasSub ? toggleMenu(item.label) : setActiveTab(item.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        activeTab === item.label ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {item.icon && <item.icon size={16} />}
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.hasSub && (
                        <ChevronDown size={14} className={`transition-transform ${openMenus[item.label] ? "rotate-180" : ""}`} />
                        )}
                    </button>
                    {item.hasSub && openMenus[item.label] && (
                        <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 mt-1">
                            {item.subItems.map((sub, j) => (
                                <button
                                    key={j}
                                    onClick={() => setActiveTab(sub.label)}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                        activeTab === sub.label ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-800 rounded-[40px] shadow-premium border border-white dark:border-slate-700 overflow-hidden">
            <div className="p-10">
              <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50 dark:border-slate-700">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">{activeTab}</h3>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
              ) : (
                renderContent()
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-6 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={fetchProfile} className="px-10 py-4 rounded-xl border-2 border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Discard</button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-10 py-4 rounded-xl bg-blue-500 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>) : (<><Save size={16} />Save</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormGroup({ label, value, onChange, type = "text", placeholder, options = [], icon }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">{label}</label>
      {type === "select" ? (
        <div className="relative">
            <select 
                value={value || ""} 
                onChange={onChange}
                className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none cursor-pointer"
            >
            <option value="">Select {label}</option>
            {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
            </select>
            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      ) : type === "date" ? (
         <div className="relative">
            <input 
                type="date" 
                value={value || ""}
                onChange={onChange}
                className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            />
         </div>
      ) : (
        <div className="relative">
            <input 
            type={type} 
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            className={`w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all ${icon ? "pl-11" : ""}`}
            />
            {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        </div>
      )}
    </div>
  );
}
