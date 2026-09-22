import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { FiSearch, FiAlertCircle } from 'react-icons/fi';
import useGetCData from '@/hooks/useGetCData';
import StoreCarrierProviderServices from '@/services/StoreCarrierProviderServices';
import CarrierProviderCard from '@/components/CarrierProviderCard';
import CarrierConnectionModal from '@/components/CarrierConnectionModal';
import { Button } from '@sofia/ui';



/**
 * Integrations > Delivery Page
 * Displays carrier providers in a grid with connection status and capabilities
 * Allows Store Admins to connect/disconnect carriers and manage credentials
 */
export default function DeliveryPage() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const { hasPermission } = useGetCData();
  const canView = hasPermission('Carrier', 'view');

  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'delivery', 'fulfillment'
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Fetch carriers
  useEffect(() => {
    fetchCarriers();
  }, [storeId]);

  const fetchCarriers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await StoreCarrierProviderServices.getStoreCarriers(
        storeId
      );
      // Backend returns carriers with "Livraison Personnelle" already first
      setCarriers(response.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t('CommonErrorLoading', 'Error loading carriers')
      );
      console.error('Error fetching carriers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter carriers by search and tab
  const filteredCarriers = useMemo(() => {
    let result = carriers;

    // Filter by tab
    if (selectedTab === 'delivery') {
      result = result;
    } else if (selectedTab === 'fulfillment') {
      result = []; // Empty for this phase
    }

    // Filter by search term (case-insensitive)
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter((carrier) =>
        carrier.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [carriers, searchTerm, selectedTab]);

  const handleConnect = (carrier) => {
    setSelectedCarrier(carrier);
    setShowConnectionModal(true);
  };

  const handleDisconnect = async (carrier) => {
    if (!window.confirm(t('ShippingConfirmDisconnect', 'Disconnect this carrier?'))) {
      return;
    }

    try {
      await StoreCarrierProviderServices.disconnectCarrier(
        storeId,
        carrier._id
      );
      fetchCarriers(); // Refetch after disconnection
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          t('CommonError', 'An error occurred')
      );
    }
  };

  const handleEdit = (carrier) => {
    // For Phase 3, edit opens the connection modal again
    // In a full implementation, this could open a separate edit form
    handleConnect(carrier);
  };

  const handleConnectionSuccess = () => {
    fetchCarriers(); // Refetch carriers after successful connection
  };

  // Permission check
  if (!canView) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">
            {t('CommonError', 'Error')}
          </p>
          <p className="text-red-600 text-sm">
            {t('AnalyticsPermissionDenied', "You don't have permission to view this page.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{t('IntegrationsTitle', 'Integrations')}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {t('ShippingDelivery', 'Delivery')}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('ShippingIntegrations', 'Shipping Integrations')}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('ShippingManageCarriers', 'Connect and manage your shipping carriers')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <Button
          type="button"
          onClick={() => setSelectedTab('all')}
          variant={selectedTab === 'all' ? 'primary' : 'ghost'}
          size="sm"
        >
          {t('CommonAll', 'All')}
        </Button>
        <Button
          type="button"
          onClick={() => setSelectedTab('delivery')}
          variant={selectedTab === 'delivery' ? 'primary' : 'ghost'}
          size="sm"
        >
          {t('ShippingDelivery', 'Delivery')}
        </Button>
        <Button
          type="button"
          disabled
          variant="ghost"
          size="sm"
          title={t('ShippingComingSoon', 'Coming soon')}
        >
          {t('ShippingFulfillment', 'Fulfillment')}
        </Button>
      </div>


      {/* Search Bar */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('ShippingSearchCarriers', 'Search carriers...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 items-start">
          <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">{t('CommonError', 'Error')}</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCarriers}
              className="mt-2 text-red-600 border-red-200 hover:bg-red-100"
            >
              {t('CommonRetry', 'Try again')}
            </Button>

          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredCarriers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">
            {searchTerm
              ? t('ShippingNoCarriersMatch', 'No carriers match your search')
              : t('ShippingNoCarriersAvailable', 'No carriers available')}
          </p>
        </div>
      )}

      {/* Carriers Grid */}
      {!loading && filteredCarriers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCarriers.map((carrier) => (
            <CarrierProviderCard
              key={carrier._id}
              carrier={carrier}
              onConnect={() => handleConnect(carrier)}
              onDisconnect={() => handleDisconnect(carrier)}
              onEdit={() => handleEdit(carrier)}
            />
          ))}
        </div>
      )}

      {/* Connection Modal */}
      <CarrierConnectionModal
        isOpen={showConnectionModal}
        carrier={selectedCarrier}
        storeId={storeId}
        onClose={() => setShowConnectionModal(false)}
        onSuccess={handleConnectionSuccess}
      />
    </div>
  );
}
