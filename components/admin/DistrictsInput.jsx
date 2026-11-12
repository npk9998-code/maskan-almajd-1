'use client';

import { DIRECTION_LABEL } from '@/lib/admin/options';

export const DIRECTION_KEYS = ['north', 'south', 'east', 'west', 'center'];
export const emptyDistricts = () => Object.fromEntries(DIRECTION_KEYS.map((k) => [k, '']));

// خمس خانات: تكتب أحياء كل جهة مفصولة بفاصلة أو سطر جديد
export default function DistrictsInput({ value, onChange }) {
  return (
    <div className="districts-input">
      {DIRECTION_KEYS.map((key) => (
        <label key={key} className="field-block">
          <span className="field-label">{DIRECTION_LABEL[key]}</span>
          <div className="field">
            <textarea
              rows={2}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              placeholder="مثال: النرجس، الملقا، الياسمين"
            />
          </div>
        </label>
      ))}
      <p className="field-hint">افصل بين الأحياء بفاصلة ( ، ) أو سطر جديد. الأحياء المكررة تنتجاهل تلقائياً.</p>
    </div>
  );
}
