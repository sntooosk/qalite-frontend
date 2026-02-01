import { useTranslation } from 'react-i18next';

interface StoreScenarioComparisonDataPoint {
  label: string;
  total: number;
  automated: number;
  notAutomated: number;
}

interface StoreScenarioComparisonChartProps {
  title: string;
  description?: string;
  data: StoreScenarioComparisonDataPoint[];
  emptyMessage: string;
  isLoading?: boolean;
}

export const StoreScenarioComparisonChart = ({
  title,
  description,
  data,
  emptyMessage,
  isLoading = false,
}: StoreScenarioComparisonChartProps) => {
  const { t } = useTranslation();
  const maxTotal = data.reduce((max, item) => Math.max(max, item.total), 0);

  return (
    <section className="card store-scenario-chart">
      <div className="store-scenario-chart__header">
        <div className="store-scenario-chart__title">
          <div>
            <span className="badge">{t('simpleChart.badge')}</span>
            <h3>{title}</h3>
          </div>
          <div className="store-scenario-chart__legend">
            <span className="store-scenario-chart__legend-item">
              <span
                className="store-scenario-chart__legend-dot store-scenario-chart__legend-dot--auto"
                aria-hidden
              />
              {t('scenarioOptions.automated')}
            </span>
            <span className="store-scenario-chart__legend-item">
              <span
                className="store-scenario-chart__legend-dot store-scenario-chart__legend-dot--manual"
                aria-hidden
              />
              {t('scenarioOptions.notAutomated')}
            </span>
          </div>
        </div>
        {description && <p className="section-subtitle">{description}</p>}
      </div>

      {isLoading ? (
        <p className="section-subtitle">{t('simpleChart.loading')}</p>
      ) : data.length === 0 ? (
        <p className="section-subtitle">{emptyMessage}</p>
      ) : (
        <ul className="store-scenario-chart__list">
          {data.map((item) => {
            const total = item.total;
            const totalWidthPercentage = maxTotal === 0 ? 0 : Math.round((total / maxTotal) * 100);
            const automatedPercentage =
              total === 0 ? 0 : Math.round((item.automated / total) * 100);
            const automatedStyle =
              automatedPercentage === 0
                ? { width: '0%' }
                : { width: `${automatedPercentage}%`, minWidth: '6px' };

            return (
              <li key={item.label} className="store-scenario-chart__item">
                <div className="store-scenario-chart__label">
                  <span className="store-scenario-chart__store">{item.label}</span>
                  <strong className="store-scenario-chart__total">
                    {t('AdminStoresPage.store-card-scenarios-badge', { scenarioCount: total })}
                  </strong>
                </div>
                <div className="store-scenario-chart__meta">
                  <span className="store-scenario-chart__meta-item">
                    <span
                      className="store-scenario-chart__legend-dot store-scenario-chart__legend-dot--auto"
                      aria-hidden
                    />
                    {t('scenarioOptions.automated')} · {item.automated}
                  </span>
                  <span className="store-scenario-chart__meta-item">
                    <span
                      className="store-scenario-chart__legend-dot store-scenario-chart__legend-dot--manual"
                      aria-hidden
                    />
                    {t('scenarioOptions.notAutomated')} · {item.notAutomated}
                  </span>
                </div>
                <div className="store-scenario-chart__bar" role="presentation" aria-hidden>
                  <div
                    className="store-scenario-chart__bar-total"
                    style={{ width: `${totalWidthPercentage}%` }}
                  >
                    <span
                      className="store-scenario-chart__bar-fill store-scenario-chart__bar-fill--auto"
                      style={automatedStyle}
                    />
                    <span
                      className="store-scenario-chart__bar-fill store-scenario-chart__bar-fill--manual"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
