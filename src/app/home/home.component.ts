import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <div class="hero-section">
        <h1 class="hero-title">Welcome to Our Store</h1>
        <p class="hero-subtitle">Discover our multi-step checkout experience</p>

        <div class="demo-cart">
          <h2 class="cart-title">Demo Shopping Cart</h2>
          <div class="cart-items">
            <div class="cart-item">
              <div class="item-image">🎧</div>
              <div class="item-details">
                <div class="item-name">Wireless Headphones</div>
                <div class="item-price">$199.99</div>
              </div>
              <div class="item-quantity">Qty: 1</div>
            </div>
            <div class="cart-item">
              <div class="item-image">🔊</div>
              <div class="item-details">
                <div class="item-name">Bluetooth Speaker</div>
                <div class="item-price">$79.99</div>
              </div>
              <div class="item-quantity">Qty: 2</div>
            </div>
          </div>

          <div class="cart-total">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$359.97</span>
            </div>
            <div class="total-row total-final">
              <span>Total:</span>
              <span>$388.77</span>
            </div>
          </div>

          <a
            routerLink="/checkout"
            class="checkout-btn"
            aria-describedby="checkout-description"
          >
            <svg class="checkout-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
              <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
            </svg>
            Proceed to Checkout
          </a>
          <div id="checkout-description" class="checkout-description">
            Experience our guided 3-step checkout process with progress tracking
          </div>
        </div>
      </div>

      <div class="features-section">
        <h2 class="features-title">Checkout Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🚚</div>
            <h3 class="feature-title">Smart Shipping</h3>
            <p class="feature-description">Address validation and shipping options</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💳</div>
            <h3 class="feature-title">Secure Payment</h3>
            <p class="feature-description">Multiple payment methods including PayPal</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3 class="feature-title">Progress Tracking</h3>
            <p class="feature-description">Clear progress indicators and step navigation</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💾</div>
            <h3 class="feature-title">Auto-Save</h3>
            <p class="feature-description">Your progress is saved automatically</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">♿</div>
            <h3 class="feature-title">Accessible</h3>
            <p class="feature-description">WCAG 2.1 AA compliant design</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3 class="feature-title">Mobile Friendly</h3>
            <p class="feature-description">Optimized for all screen sizes</p>
          </div>
        </div>
      </div>

      <div class="cta-section">
        <h2 class="cta-title">Ready to Experience Better Checkout?</h2>
        <p class="cta-description">
          Our multi-step checkout reduces cart abandonment by 15% and provides a
          smoother, more intuitive shopping experience.
        </p>
        <a
          routerLink="/checkout"
          class="cta-btn"
        >
          Start Demo Checkout
        </a>
      </div>
    </div>
  `,
  styleUrl: './home.component.css'
})
export class HomeComponent {}