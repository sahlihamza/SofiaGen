import React from "react";
import { Modal, ModalBody } from "@windmill/react-ui";
import { FiX } from "react-icons/fi";
import { IconButton } from "@sofia/ui";

// Generic simple modal for forms
const SimpleModal = ({ isOpen, onClose, children, title }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="px-6 pt-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <IconButton
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </IconButton>
        </div>
        {children}
      </ModalBody>
    </Modal>
  );
};

export default SimpleModal;
