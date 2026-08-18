/**
 * 🎯 PHASE 1: Simulated Payment Service
 * 
 * This simulates payment processing without real Razorpay integration
 * Later: Just replace with real Razorpay calls
 */

const generateOrderId = () => {
  return 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const generatePaymentId = () => {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Create payment order (simulated)
 */
const createOrder = async (amount, type, userData) => {
  try {
    const orderId = generateOrderId();
    
    // Simulate order creation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      order: {
        id: orderId,
        amount: amount,
        currency: 'INR',
        status: 'created',
        notes: {
          type: type,
          name: userData.name || userData.donorName,
          email: userData.email || userData.donorEmail,
          phone: userData.phone || userData.donorPhone
        }
      }
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: 'Failed to create payment order'
    };
  }
};

/**
 * Verify payment (simulated)
 */
const verifyPayment = async (paymentData) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Simulated gateway always succeeds so demos are reliable (replace with real Razorpay verify in production).
    return {
      success: true,
      payment: {
        id: generatePaymentId(),
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        status: 'completed',
        method: 'simulated',
        verified_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Verify payment error:', error);
    return {
      success: false,
      error: 'Payment verification failed'
    };
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
