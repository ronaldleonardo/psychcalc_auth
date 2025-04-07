import React, { useState } from "react";

const SaveModal = ({ isOpen, onClose, onSave, defaultTitle }) => {
  const [title, setTitle] = useState(defaultTitle);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(title);
    setIsSaving(false);
    onClose();
    setTitle(defaultTitle);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Save to History</h3>
        <form onSubmit={handleSubmit}>
          <input
            className="modal-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assessment name"
            autoFocus
            required
          />
          <div className="modal-buttons">
            <button
              type="submit"
              disabled={isSaving}
              className="confirm-button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveModal;
