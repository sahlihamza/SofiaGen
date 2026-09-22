import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheck, FiX, FiExternalLink } from 'react-icons/fi';
import { IconButton, SecondaryButton, PrimaryButton } from "@sofia/ui";

/**
 * CarrierProviderCard component
 * Displays a carrier provider card with connection status and capabilities
 *
 * Props:
 * - carrier: { _id, name, logoUrl, brandColor, connected, hasLabelGeneration, hasTracking, isInternalFleet }
 * - onConnect: callback when user clicks to connect
 * - onDisconnect: callback when user clicks to disconnect
 * - onEdit: callback when user clicks to edit/modify
 */
export default function CarrierProviderCard({
  carrier,
  onConnect,
  onDisconnect,
  onEdit,
}) {
  const { t } = useTranslation();

  if (!carrier) return null;

  const canGenerateLabel = carrier.connected && carrier.hasLabelGeneration;
  const canTrack = carrier.connected && carrier.hasTracking;

  const statusBadge = (active, label) => (
    <div className="flex items-center gap-2 text-sm">
      {active ? (
        <FiCheck className="w-4 h-4 text-green-600" />
      ) : (
        <FiX className="w-4 h-4 text-red-600" />
      )}
      <span className={active ? 'text-green-700' : 'text-red-700'}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Logo Section with Brand Color Background */}
      <div
        className="h-24 rounded-t-lg flex items-center justify-center p-4 relative"
        style={{
          background: carrier.brandColor || '#000000',
          opacity: 0.9,
        }}
      >
        {carrier.logoUrl && (
          <img
            src={carrier.logoUrl}
            alt={carrier.name}
            className="h-16 w-16 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Carrier Name */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm md:text-base">
            {carrier.name}
          </h3>
          {carrier.connected && !carrier.isInternalFleet && (
            <IconButton
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onEdit}
              className="p-1 hover:bg-gray-100 rounded"
              title={t('ShippingEdit', 'Edit')}
            >
              <FiExternalLink className="w-4 h-4 text-gray-500" />
            </IconButton>
          )}
        </div>

        {/* Capabilities Status */}
        <div className="space-y-1.5 border-t pt-3">
          {statusBadge(
            carrier.hasLabelGeneration,
            t('ShippingLabels', 'Labels')
          )}
          {statusBadge(
            carrier.hasTracking,
            t('ShippingTracking', 'Tracking')
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t">
          {carrier.connected ? (
            <SecondaryButton
              onClick={onDisconnect}
              className="w-full px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
            >
              {t('ShippingDisconnect', 'Disconnect')}
            </SecondaryButton>
          ) : (
            <PrimaryButton
              onClick={onConnect}
              className="w-full px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
            >
              {t('ShippingConnect', 'Connect')}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
