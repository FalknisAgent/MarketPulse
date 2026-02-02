import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './HoldingForm.css';

function HoldingForm({ symbol, existingHolding, onClose }) {
    const { actions } = useApp();

    const [formData, setFormData] = useState({
        symbol: symbol || existingHolding?.symbol || '',
        shares: existingHolding?.shares || '',
        buyPrice: existingHolding?.buyPrice || '',
        fees: existingHolding?.fees || '0',  // NEW
        tax: existingHolding?.tax || '0',    // NEW
        buyDate: existingHolding?.buyDate || new Date().toISOString().split('T')[0]
    });

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};

        if (!formData.symbol) {
            newErrors.symbol = 'Symbol is required';
        }

        // Float validation for shares
        if (!formData.shares || parseFloat(formData.shares) <= 0) {
            newErrors.shares = 'Enter a valid number of shares';
        }

        if (!formData.buyPrice || parseFloat(formData.buyPrice) <= 0) {
            newErrors.buyPrice = 'Enter a valid buy price';
        }

        if (parseFloat(formData.fees) < 0) {
            newErrors.fees = 'Fees cannot be negative';
        }

        if (parseFloat(formData.tax) < 0) {
            newErrors.tax = 'Tax cannot be negative';
        }

        if (!formData.buyDate) {
            newErrors.buyDate = 'Date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            await actions.addHolding({
                id: existingHolding?.id,
                symbol: formData.symbol.toUpperCase(),
                shares: parseFloat(formData.shares), // Already supports float
                buyPrice: parseFloat(formData.buyPrice),
                fees: parseFloat(formData.fees || 0), // NEW
                tax: parseFloat(formData.tax || 0),   // NEW
                buyDate: formData.buyDate
            });
            onClose();
        } catch (err) {
            setErrors({ submit: 'Failed to save holding' });
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    return (
        <div className="holding-form-overlay">
            <div className="holding-form">
                <div className="form-header">
                    <h3>{existingHolding ? 'Edit Position' : 'Add Position'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="symbol">Stock Symbol</label>
                        <input
                            id="symbol"
                            type="text"
                            className={`input ${errors.symbol ? 'input-error' : ''}`}
                            value={formData.symbol}
                            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                            placeholder="AAPL"
                            disabled={!!symbol}
                        />
                        {errors.symbol && <span className="error-text">{errors.symbol}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="shares">Quantity</label>
                            <input
                                id="shares"
                                type="number"
                                step="any" // Allows float
                                className={`input ${errors.shares ? 'input-error' : ''}`}
                                value={formData.shares}
                                onChange={(e) => handleChange('shares', e.target.value)}
                                placeholder="10.5"
                            />
                            {errors.shares && <span className="error-text">{errors.shares}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="buyPrice">Buy Price ($)</label>
                            <input
                                id="buyPrice"
                                type="number"
                                step="0.01"
                                className={`input ${errors.buyPrice ? 'input-error' : ''}`}
                                value={formData.buyPrice}
                                onChange={(e) => handleChange('buyPrice', e.target.value)}
                                placeholder="150.00"
                            />
                            {errors.buyPrice && <span className="error-text">{errors.buyPrice}</span>}
                        </div>
                    </div>

                    {/* NEW ROW FOR FEES AND TAX */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="fees">Fees ($)</label>
                            <input
                                id="fees"
                                type="number"
                                step="0.01"
                                className={`input ${errors.fees ? 'input-error' : ''}`}
                                value={formData.fees}
                                onChange={(e) => handleChange('fees', e.target.value)}
                                placeholder="0.00"
                            />
                            {errors.fees && <span className="error-text">{errors.fees}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="tax">Tax ($)</label>
                            <input
                                id="tax"
                                type="number"
                                step="0.01"
                                className={`input ${errors.tax ? 'input-error' : ''}`}
                                value={formData.tax}
                                onChange={(e) => handleChange('tax', e.target.value)}
                                placeholder="0.00"
                            />
                            {errors.tax && <span className="error-text">{errors.tax}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="buyDate">Purchase Date</label>
                        <input
                            id="buyDate"
                            type="date"
                            className={`input ${errors.buyDate ? 'input-error' : ''}`}
                            value={formData.buyDate}
                            onChange={(e) => handleChange('buyDate', e.target.value)}
                        />
                        {errors.buyDate && <span className="error-text">{errors.buyDate}</span>}
                    </div>

                    {errors.submit && (
                        <div className="form-error">{errors.submit}</div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {existingHolding ? 'Update Position' : 'Add Position'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default HoldingForm;
