import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './HoldingForm.css';

function HoldingForm({ symbol, existingHolding, onClose }) {
    const { state, actions } = useApp();

    const [type, setType] = useState(existingHolding?.type || 'BUY');
    const [formData, setFormData] = useState({
        symbol: symbol || existingHolding?.symbol || '',
        shares: existingHolding?.shares || '',
        price: existingHolding?.price || '',
        fees: existingHolding?.fees || '0',
        tax: existingHolding?.tax || '0',
        date: existingHolding?.date || new Date().toISOString().split('T')[0]
    });

    const [errors, setErrors] = useState({});

    // Calculate max shares available to sell
    const currentShares = state.portfolio
        .filter(t => t.symbol === formData.symbol.toUpperCase())
        .reduce((sum, t) => t.type === 'SELL' ? sum - t.shares : sum + t.shares, 0);

    const validate = () => {
        const newErrors = {};

        if (!formData.symbol) newErrors.symbol = 'Symbol is required';
        if (!formData.shares || parseFloat(formData.shares) <= 0) newErrors.shares = 'Enter a valid number of shares';
        if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Enter a valid price';
        if (parseFloat(formData.fees) < 0) newErrors.fees = 'Fees cannot be negative';
        if (parseFloat(formData.tax) < 0) newErrors.tax = 'Tax cannot be negative';
        if (!formData.date) newErrors.date = 'Date is required';

        if (type === 'SELL' && parseFloat(formData.shares) > currentShares) {
            newErrors.shares = `You only have ${currentShares} shares available to sell.`;
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
                type,
                shares: parseFloat(formData.shares),
                price: parseFloat(formData.price),
                fees: parseFloat(formData.fees || 0),
                tax: parseFloat(formData.tax || 0),
                date: formData.date
            });
            onClose();
        } catch (err) {
            setErrors({ submit: 'Failed to save transaction' });
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
                    <h3>{existingHolding ? 'Edit Transaction' : 'Add Transaction'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {!existingHolding && (
                    <div className="tx-type-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button 
                            type="button"
                            className={`btn ${type === 'BUY' ? 'btn-primary' : 'btn-outline'}`} 
                            style={{ flex: 1, backgroundColor: type === 'BUY' ? 'var(--color-success)' : 'transparent', borderColor: 'var(--color-success)' }}
                            onClick={() => setType('BUY')}
                        >
                            BUY
                        </button>
                        <button 
                            type="button"
                            className={`btn ${type === 'SELL' ? 'btn-primary' : 'btn-outline'}`} 
                            style={{ flex: 1, backgroundColor: type === 'SELL' ? 'var(--color-danger)' : 'transparent', borderColor: 'var(--color-danger)' }}
                            onClick={() => setType('SELL')}
                        >
                            SELL
                        </button>
                    </div>
                )}

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
                            <label htmlFor="shares">Shares</label>
                            <input
                                id="shares"
                                type="number"
                                step="any"
                                min="0.000001"
                                className={`input ${errors.shares ? 'input-error' : ''}`}
                                value={formData.shares}
                                onChange={(e) => handleChange('shares', e.target.value)}
                                placeholder="10.5"
                            />
                            {errors.shares && <span className="error-text">{errors.shares}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="price">Price (Native Currency)</label>
                            <input
                                id="price"
                                type="number"
                                step="any"
                                min="0.01"
                                className={`input ${errors.price ? 'input-error' : ''}`}
                                value={formData.price}
                                onChange={(e) => handleChange('price', e.target.value)}
                                placeholder="150.00"
                            />
                            {errors.price && <span className="error-text">{errors.price}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="fees">Fees (Native Currency)</label>
                            <input
                                id="fees"
                                type="number"
                                step="any"
                                className={`input ${errors.fees ? 'input-error' : ''}`}
                                value={formData.fees}
                                onChange={(e) => handleChange('fees', e.target.value)}
                                placeholder="0.00"
                            />
                            {errors.fees && <span className="error-text">{errors.fees}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="tax">Tax (Native Currency)</label>
                            <input
                                id="tax"
                                type="number"
                                step="any"
                                className={`input ${errors.tax ? 'input-error' : ''}`}
                                value={formData.tax}
                                onChange={(e) => handleChange('tax', e.target.value)}
                                placeholder="0.00"
                            />
                            {errors.tax && <span className="error-text">{errors.tax}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="date">Transaction Date</label>
                        <input
                            id="date"
                            type="date"
                            className={`input ${errors.date ? 'input-error' : ''}`}
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                        />
                        {errors.date && <span className="error-text">{errors.date}</span>}
                    </div>

                    {errors.submit && (
                        <div className="form-error">{errors.submit}</div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {existingHolding ? 'Update Transaction' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default HoldingForm;
