import React, { useEffect, useState } from "react";
import { Select } from "@windmill/react-ui";
import RoleServices from "@/services/RoleServices";

const SelectRole = ({ setRole, register, name, label }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await RoleServices.getRoles();
        const roleList = Array.isArray(data) ? data : data?.data || data?.roles || [];
        setRoles(roleList);
      } catch (error) {
        console.error("Failed to load roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return (
    <>
      <Select
        className="mb-3 h-10"
        onChange={(e) => setRole(e.target.value)}
        name={name}
        {...register(`${name}`, {
          required: `${label} is required!`,
        })}
      >
        <option value="" defaultValue hidden>
          {loading ? "Loading roles..." : "Staff role"}
        </option>
        {roles.map((role) => (
          <option key={role._id} value={role.name}>
            {role.name}
          </option>
        ))}
      </Select>
    </>
  );
};

export default SelectRole;
