import os
import time

def generate_timestamp(rel_path):
    full = os.path.join(os.path.dirname(__file__), '..', 'public', rel_path)
    return str(int(os.path.getmtime(full))) if os.path.exists(full) else '1'

# Generate untuk kpi_card.js
timestamp = generate_timestamp('js/kpi_card.js')
with open('apps/erpx_new_custom_theme/erpx_new_custom_theme/public/js/kpi_card.js', 'a') as f:
    f.write(f"\n// Timestamp: {timestamp}\n")

# Generate untuk custom14.js
timestamp = generate_timestamp('js/custom14.js')
with open('apps/erpx_new_custom_theme/erpx_new_custom_theme/public/js/custom14.js', 'a') as f:
    f.write(f"\n// Timestamp: {timestamp}\n")
