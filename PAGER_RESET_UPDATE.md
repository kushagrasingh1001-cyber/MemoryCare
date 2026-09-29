# Pager reset/update
- Each routine, medicine and contact can be deleted and rewritten.
- Save Changes updates only Firestore Pager Management data.
- Sync / Replace Pager Data sends `MCV1|REPLACE_ALL`, the complete current dataset, then `MCV1|END`.
- Clear Device Only sends `MCV1|CLEAR_ALL` and preserves Firestore data.
- Clear All Pager Data sends CLEAR_ALL when connected and deletes the Firestore pagerData/main document.
- ESP32 firmware must implement MCV1|REPLACE_ALL and MCV1|CLEAR_ALL for physical-device erase/replace behavior.
