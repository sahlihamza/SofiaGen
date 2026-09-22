import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import StoreCarrierProviderServices from '@/services/StoreCarrierProviderServices';
import { IconButton, SecondaryButton, PrimaryButton } from "@sofia/ui";

/**
 * CarrierConnectionModal component
 * Modal for connecting a carrier to a store and entering credentials
 *
 * Props:
 * - isOpen: boolean
 * - carrier: carrier provider object
 * - storeId: current store ID
 * - onClose: callback when modal closes
 * - onSuccess: callback after successful connection
 */
export default function CarrierConnectionModal({
  isOpen,
  carrier,
  storeId,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState({
    apiKey: '',
    secretKey: '',
    accountNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !carrier) return null;

  const handleInputChange = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await StoreCarrierProviderServices.connectCarrier(
        storeId,
        carrier._id,
        credentials
      );
      setCredentials({ apiKey: '', secretKey: '', accountNumber: '' });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || t('CommonError', 'An error occurred')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{carrier.name}</h2>
          <IconButton
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiX className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ShippingApiKey', 'API Key')}
            </label>
            <input
              type="password"
              value={credentials.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t('ShippingEnterApiKey', 'Enter API Key')}
              required
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ShippingSecretKey', 'Secret Key')}
            </label>
            <input
              type="password"
              value={credentials.secretKey}
              onChange={(e) => handleInputChange('secretKey', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t('ShippingEnterSecretKey', 'Enter Secret Key')}
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('ShippingAccountNumber', 'Account Number')}
            </label>
            <input
              type="text"
              value={credentials.accountNumber}
              onChange={(e) =>
                handleInputChange('accountNumber', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t(
                'ShippingEnterAccountNumber',
                'Enter Account Number'
              )}
              required
            />
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500">
            {t(
              'ShippingCredentialsSecure',
              'Your credentials are encrypted and never displayed in plain text.'
            )}
          </p>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <SecondaryButton
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {t('CommonCancel', 'Cancel')}
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={loading}
              loading={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t('CommonConnect', 'Connect')}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
