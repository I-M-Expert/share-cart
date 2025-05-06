import React, { useState, useMemo } from "react";
import { Modal, TextField, Checkbox, VerticalStack, Button, Spinner } from "@shopify/polaris";

export default function AssignModal({
  open,
  onClose,
  items,
  selected,
  onSave,
  title = "Assign Items",
  loading = false,
}) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState(selected);

  // Reset local state when modal opens/closes
  React.useEffect(() => {
    setLocalSelected(selected);
    setSearch("");
  }, [open, selected]);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleToggle = (value) => {
    setLocalSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={{
        content: "Save",
        onAction: () => onSave(localSelected),
      }}
      secondaryActions={[
        { content: "Cancel", onAction: onClose },
      ]}
    >
      <Modal.Section>
        <TextField
          label="Search"
          value={search}
          onChange={setSearch}
          autoComplete="off"
        />
        <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 16 }}>
          {loading ? (
            <Spinner size="small" />
          ) : (
            <VerticalStack gap="2">
              {filteredItems.length === 0 && <div>No items found.</div>}
              {filteredItems.map((item) => (
                <Checkbox
                  key={item.value}
                  label={item.label}
                  checked={localSelected.includes(item.value)}
                  onChange={() => handleToggle(item.value)}
                />
              ))}
            </VerticalStack>
          )}
        </div>
      </Modal.Section>
    </Modal>
  );
}