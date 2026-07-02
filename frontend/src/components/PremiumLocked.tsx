import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function PremiumLocked({ featureName }) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="premium-locked">
      <div className="premium-locked-icon" aria-hidden="true">
        🔒
      </div>
      <h2 className="premium-locked-title">{featureName || t('saas.upgrade_required')}</h2>
      <p className="premium-locked-desc">{t('saas.feature_locked_desc')}</p>
      <button
        onClick={() => navigate('/saas/plans')}
        className="btn btn-primary premium-locked-btn"
      >
        {t('saas.view_plans')}
      </button>
    </div>
  );
}
