import { useState } from "react";

export const useCircularFilters = () => {
  const [filters, setFilters] = useState({
    year:     null,
    branch:   null,
    section:  null,
    priority: null,
    sort:     "newest",
  });

  const [showFilters, setShowFilters] = useState(false);

  const reset = () => setFilters({
    year: null, branch: null, section: null, priority: null, sort: "newest",
  });

  // Apply filters to a list of circulars
  const applyFilters = (circulars = []) => {
    let list = [...circulars];

    if (filters.year)
      list = list.filter((c) =>
        c.target_year === filters.year ||
        c.target_year === "all" ||
        !c.target_year
      );

    if (filters.branch)
      list = list.filter((c) =>
        c.department_target?.toUpperCase() === filters.branch.toUpperCase() ||
        c.department_target === "all" ||
        !c.department_target
      );

    if (filters.section)
      list = list.filter((c) =>
        c.target_section?.toUpperCase() === filters.section.toUpperCase() ||
        c.target_section === "all" ||
        !c.target_section
      );

    if (filters.priority && filters.priority !== "All")
      list = list.filter((c) =>
        c.priority?.toLowerCase() === filters.priority.toLowerCase()
      );

    if (filters.sort === "oldest")
      list.sort((a, b) => (a.created_at?.seconds - b.created_at?.seconds) || (new Date(a.created_at) - new Date(b.created_at)));
    else if (filters.sort === "views")
      list.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    else
      list.sort((a, b) => (b.created_at?.seconds - a.created_at?.seconds) || (new Date(b.created_at) - new Date(a.created_at)));

    return list;
  };

  const activeCount = Object.values(filters)
    .filter((v) => v !== null && v !== "newest" && v !== "All").length;

  return { filters, setFilters, showFilters, setShowFilters, reset, applyFilters, activeCount };
};
