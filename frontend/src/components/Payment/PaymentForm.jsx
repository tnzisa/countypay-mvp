import React, { useState } from 'react';
import {
  Phone,
  Lock,
  AlertCircle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { Card, Button, Input, Select, Badge, Alert, Modal, Spinner } from './Common/UI';

/**
 * Payment Form Component
 * Handles payment creation with validation
 */
export const PaymentForm = ({
  fees,
  onSubmit,
  loading = false,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState({
    feeId: '',
    phoneNumber: '',
    paymentMethod: 'stripe',
    confirmPhone: ''
  });

  const [errors, setErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.feeId) {
      newErrors.feeId = 'Please select a fee';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^254\d{9}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber =
        'Invalid phone format (use 254XXXXXXXXX)';
    }

    if (formData.phoneNumber !== formData.confirmPhone) {
      newErrors.confirmPhone = 'Phone numbers do not match';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select payment method';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const handleConfirmPayment = async () => {
    setSubmitLoading(true);
    try {
      await onSubmit({
        feeId: formData.feeId,
        phoneNumber: formData.phoneNumber,
        paymentMethod: formData.paymentMethod,
        idempotencyKey: `${formData.feeId}-${formData.phoneNumber}-${Date.now()}`
      });

      // Reset form
      setFormData({
        feeId: '',
        phoneNumber: '',
        paymentMethod: 'stripe',
        confirmPhone: ''
      });

      setShowConfirmation(false);
      onSuccess?.();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedFee = fees?.find((f) => f.id === formData.feeId);

  return (
    <>
      <Card title="Make Payment" subtitle="Complete your fee payment securely">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fee Selection */}
          <Select
            label="Select Fee"
            required
            value={formData.feeId}
            onChange={handleChange}
            name="feeId"
            error={errors.feeId}
            options={
              fees?.map((fee) => ({
                value: fee.id,
                label: `${fee.name} - KES ${fee.amount?.toLocaleString()}`
              })) || []
            }
            placeholder="Choose a fee to pay"
          />

          {/* Fee Details */}
          {selectedFee && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    {selectedFee.name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Category: {selectedFee.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    KES{' '}
                    {selectedFee.amount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <Select
            label="Payment Method"
            required
            value={formData.paymentMethod}
            onChange={handleChange}
            name="paymentMethod"
            error={errors.paymentMethod}
            options={[
              { value: 'stripe', label: '💳 Credit/Debit Card' },
              { value: 'bank_transfer', label: '🏦 Bank Transfer' }
            ]}
          />

          {/* Phone Number */}
          <Input
            label="Phone Number"
            type="tel"
            required
            placeholder="254712345678"
            value={formData.phoneNumber}
            onChange={handleChange}
            name="phoneNumber"
            error={errors.phoneNumber}
            icon={Phone}
          />

          {/* Confirm Phone Number */}
          <Input
            label="Confirm Phone Number"
            type="tel"
            required
            placeholder="254712345678"
            value={formData.confirmPhone}
            onChange={handleChange}
            name="confirmPhone"
            error={errors.confirmPhone}
            icon={Lock}
          />

          {/* Security Notice */}
          <Alert
            type="info"
            title="Payment Security"
            message="Your payment is protected with 256-bit encryption and fraud detection. You will receive a confirmation SMS after payment."
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitLoading}
          >
            Review Payment
          </Button>
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Confirm Payment"
        size="md"
      >
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Fee</span>
              <span className="font-medium">{selectedFee?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-bold text-lg">
                KES {selectedFee?.amount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium">{formData.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Method</span>
              <Badge variant="primary">
                {formData.paymentMethod.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Terms */}
          <Alert
            type="warning"
            title="Please Confirm"
            message="By proceeding, you authorize this payment. Ensure the phone number and amount are correct."
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowConfirmation(false)}
              disabled={submitLoading}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              loading={submitLoading}
              onClick={handleConfirmPayment}
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/**
 * Payment Status Display
 * Shows payment result
 */
export const PaymentStatus = ({
  status,
  transactionRef,
  amount,
  feeName,
  message,
  onDone
}) => {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      title: 'Payment Successful!',
      subtitle: 'Your fee has been paid successfully'
    },
    processing: {
      icon: Spinner,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'Processing Payment',
      subtitle: 'Your payment is being processed...'
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'Payment Failed',
      subtitle: 'Your payment could not be processed'
    }
  };

  const config = statusConfig[status] || statusConfig.processing;
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className={`${config.bg} border-2 ${config.border} max-w-md w-full`}>
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${config.bg}`}>
              <Icon className={`${config.color} w-12 h-12`} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900">
            {config.title}
          </h2>

          {/* Subtitle */}
          <p className="text-gray-600">{config.subtitle}</p>

          {/* Details */}
          {amount && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold text-lg">
                  KES {amount?.toLocaleString()}
                </span>
              </div>
              {feeName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fee</span>
                  <span className="font-medium">{feeName}</span>
                </div>
              )}
              {transactionRef && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {transactionRef}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
            <Alert type={status === 'failed' ? 'error' : 'info'} message={message} />
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4">
            {status === 'success' && (
              <>
                <Button variant="success" fullWidth onClick={onDone}>
                  View Receipt
                </Button>
                <Button variant="secondary" fullWidth>
                  Make Another Payment
                </Button>
              </>
            )}
            {status === 'failed' && (
              <>
                <Button variant="danger" fullWidth onClick={onDone}>
                  Retry Payment
                </Button>
                <Button variant="secondary" fullWidth>
                  Go Back
                </Button>
              </>
            )}
            {status === 'processing' && (
              <p className="text-sm text-gray-600">
                You will receive a confirmation SMS shortly
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * Payment History Component
 * Shows user's recent payments
 */
export const PaymentHistory = ({ transactions, loading = false }) => {
  return (
    <Card title="Payment History">
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : transactions && transactions.length > 0 ? (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <DollarSign className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {tx.fee?.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    KES {tx.amount?.toLocaleString()}
                  </p>
                  <Badge
                    variant={
                      tx.status === 'COMPLETED'
                        ? 'success'
                        : tx.status === 'PROCESSING'
                          ? 'warning'
                          : 'danger'
                    }
                    size="sm"
                  >
                    {tx.status}
                  </Badge>
                </div>
                {tx.status === 'FAILED' && (
                  <Button variant="warning" size="sm">
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 py-8 text-center">
            No payment history
          </p>
        )}
      </div>
    </Card>
  );
};
