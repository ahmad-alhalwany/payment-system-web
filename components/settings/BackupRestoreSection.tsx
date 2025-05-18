import React, { useState } from 'react';

interface BackupRestoreSectionProps {
  onBackup: () => void;
  onRestore: (file: File) => void;
}

export default function BackupRestoreSection({ onBackup, onRestore }: BackupRestoreSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        setError('يرجى اختيار ملف JSON صالح');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleRestore = () => {
    if (!selectedFile) {
      setError('يرجى اختيار ملف للاستعادة');
      return;
    }
    onRestore(selectedFile);
    setSelectedFile(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-primary-700">النسخ الاحتياطي والاستعادة</h2>
      
      <div className="space-y-6">
        {/* Backup Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">النسخ الاحتياطي</h3>
          <p className="text-sm text-gray-600 mb-3">
            قم بإنشاء نسخة احتياطية من جميع بيانات النظام
          </p>
          <button
            onClick={onBackup}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            إنشاء نسخة احتياطية
          </button>
        </div>

        {/* Restore Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-700">استعادة البيانات</h3>
          <p className="text-sm text-gray-600 mb-3">
            استعادة البيانات من نسخة احتياطية سابقة
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
              />
            </div>
            
            {selectedFile && (
              <div className="text-sm text-gray-600">
                الملف المحدد: {selectedFile.name}
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              onClick={handleRestore}
              disabled={!selectedFile}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                selectedFile
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              استعادة البيانات
            </button>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">تنبيه</h4>
          <p className="text-sm text-yellow-700">
            تأكد من صحة ملف النسخة الاحتياطية قبل الاستعادة. قد تؤدي الاستعادة من ملف غير صالح إلى فقدان البيانات.
          </p>
        </div>
      </div>
    </div>
  );
} 