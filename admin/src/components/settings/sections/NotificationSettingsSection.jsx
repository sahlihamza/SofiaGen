import React, { useState, useEffect } from "react";
import { FiBell, FiShield, FiCheckCircle, FiLock, FiSave, FiRefreshCw } from "react-icons/fi";
import { Card, CardBody, Badge } from "@windmill/react-ui";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const CATEGORIES = [
  { id: "orders", label: "Commandes & Achats", desc: "CrÃ©ation, mises Ã  jour, annulations et livraisons de commandes" },
  { id: "payments", label: "Paiements & Transactions", desc: "Confirmations de paiement, remboursements, Ã©checs de dÃ©bit" },
  { id: "inventory", label: "Inventaire & Stocks", desc: "Alertes de stock bas et rupture de stock des produits" },
  { id: "subscriptions", label: "Abonnements & Forfaits", desc: "Renouvellement, expiration et facturation de la boutique" },
  { id: "invoices", label: "Factures & PiÃ¨ces", desc: "CrÃ©ation et retards de rÃ¨glement des factures" },
  { id: "users", label: "Utilisateurs & Ã‰quipes", desc: "Nouveaux membres, invitations et changements de rÃ´le" },
  { id: "security", label: "SÃ©curitÃ© & Connexions", desc: "Alertes d'authentification et modifications de mot de passe (Obligatoire)", isCritical: true },
  { id: "store", label: "Boutique & Statut", desc: "Ã‰vÃ©nements de cycle de vie et statut de la boutique" },
  { id: "customers", label: "Clients & Comptes", desc: "Inscriptions et mises Ã  jour de profil client" },
  { id: "reviews", label: "Avis & Ã‰valuations", desc: "Nouveaux avis clients Ã  modÃ©rer" },
  { id: "tickets", label: "Support & Tickets", desc: "Nouveaux tickets support et rÃ©ponses agents" },
];

const NotificationSettingsSection = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({});

  const token = localStorage.getItem("adminToken");

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      } else {
        // Default preferences
        const initial = {};
        CATEGORIES.forEach((c) => {
          initial[c.id] = {
            in_app: true,
            email: true,
            push: false,
          };
        });
        setPreferences(initial);
      }
    } catch (err) {
      console.error("Failed to load notification preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = (categoryId, channel) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (cat?.isCritical && (channel === "in_app" || channel === "email")) {
      notifyError("La sÃ©curitÃ© est une catÃ©gorie critique et ne peut pas Ãªtre dÃ©sactivÃ©e.");
      return;
    }

    setPreferences((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [channel]: !prev[categoryId]?.[channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        notifySuccess("PrÃ©fÃ©rences de notification enregistrÃ©es avec succÃ¨s !");
      } else {
        notifyError(data.message || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      notifyError("Erreur rÃ©seau lors de l'enregistrement des prÃ©fÃ©rences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiBell className="text-emerald-500" />
            PrÃ©fÃ©rences de Notifications
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personnalisez la rÃ©ception de vos alertes et notifications par catÃ©gorie et par canal de diffusion.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} icon={FiSave} className="bg-emerald-600 hover:bg-emerald-700 mt-3 md:mt-0">
          {saving ? "Enregistrement..." : "Enregistrer les PrÃ©fÃ©rences"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CATEGORIES.map((cat) => {
          const pref = preferences[cat.id] || { in_app: true, email: true, push: false };
          return (
            <Card key={cat.id} className="p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{cat.label}</h4>
                    {cat.isCritical && (
                      <Badge type="warning" className="flex items-center gap-1 text-[10px] uppercase">
                        <FiLock className="w-3 h-3" /> Critique
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.desc}</p>
                </div>

                <div className="flex items-center gap-6">
                  {/* In-App Toggle */}
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!pref.in_app}
                      disabled={cat.isCritical}
                      onChange={() => handleToggle(cat.id, "in_app")}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 disabled:opacity-50"
                    />
                    In-App
                  </label>

                  {/* Email Toggle */}
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!pref.email}
                      disabled={cat.isCritical}
                      onChange={() => handleToggle(cat.id, "email")}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 disabled:opacity-50"
                    />
                    Email
                  </label>

                  {/* Push Toggle */}
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!pref.push}
                      onChange={() => handleToggle(cat.id, "push")}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    Push
                  </label>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationSettingsSection;
