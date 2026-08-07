<script setup lang="ts">
import type { ServiceShareCardData, ServiceShareCardItem } from '~/types/share'

const props = defineProps<{ data: ServiceShareCardData }>()
const { number, money, date } = useFormat()

const visibleProducts = computed(() => props.data.products.slice(0, 3))
const visibleServices = computed(() => props.data.services.slice(0, 3))
const remainingProducts = computed(() => Math.max(0, props.data.products.length - visibleProducts.value.length))
const remainingServices = computed(() => Math.max(0, props.data.services.length - visibleServices.value.length))

function itemKey(prefix: string, item: ServiceShareCardItem, index: number) {
  return `${prefix}-${index}-${item.description}`
}
</script>

<template>
  <article class="service-card" dir="rtl">
    <div class="service-card__glow service-card__glow--right" />
    <div class="service-card__glow service-card__glow--left" />

    <header class="service-card__header">
      <div class="service-card__brand">
        <span class="service-card__mark">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M32 6C25 18 13 30 13 42a19 19 0 0 0 38 0C51 30 39 18 32 6Z" fill="currentColor" />
            <path d="M39.5 46.5c-2.2 3.4-5.7 5.5-10.2 5.5" fill="none" stroke="#174833" stroke-linecap="round" stroke-width="4" />
          </svg>
        </span>
        <div class="service-card__brand-copy">
          <strong>{{ data.shopName }}</strong>
          <span v-if="data.customerName">برای {{ data.customerName }}</span>
        </div>
      </div>
      <time>{{ date(data.serviceDate) }}</time>
    </header>

    <section class="service-card__metrics">
      <div class="service-card__metric">
        <span>کیلومتر فعلی</span>
        <strong>{{ number(data.odometer) }}</strong>
        <small>کیلومتر</small>
      </div>
      <div class="service-card__metric">
        <span>سرویس بعدی</span>
        <strong>{{ data.nextDueOdometer ? number(data.nextDueOdometer) : '—' }}</strong>
        <small>{{ data.nextDueOdometer ? `کیلومتر${data.nextDueItem ? ` · ${data.nextDueItem}` : ''}` : 'ثبت نشده' }}</small>
      </div>
      <div class="service-card__metric">
        <span>شماره فاکتور</span>
        <strong class="service-card__invoice">{{ data.invoiceNo }}</strong>
        <small>ثبت نهایی</small>
      </div>
      <div class="service-card__metric service-card__metric--total">
        <span>مبلغ نهایی</span>
        <strong>{{ money(data.totalAmount, data.currency) }}</strong>
      </div>
    </section>

    <section class="service-card__columns">
      <div class="service-card__group">
        <header class="service-card__group-header">
          <strong>محصولات مصرفی</strong>
          <span>{{ number(data.products.length) }} مورد</span>
        </header>
        <div v-if="visibleProducts.length" class="service-card__list">
          <div v-for="(item, index) in visibleProducts" :key="itemKey('product', item, index)" class="service-card__item">
            <span class="service-card__check">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <strong>{{ item.description }}</strong>
            <span class="service-card__price">{{ money(item.totalAmount, data.currency) }}</span>
          </div>
          <p v-if="remainingProducts" class="service-card__more">+ {{ number(remainingProducts) }} محصول دیگر</p>
        </div>
        <p v-else class="service-card__empty">محصولی ثبت نشده است</p>
      </div>

      <div class="service-card__group">
        <header class="service-card__group-header">
          <strong>خدمات انجام‌شده</strong>
          <span>{{ number(data.services.length) }} مورد</span>
        </header>
        <div v-if="visibleServices.length" class="service-card__list">
          <div v-for="(item, index) in visibleServices" :key="itemKey('service', item, index)" class="service-card__item">
            <span class="service-card__check">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <strong>{{ item.description }}</strong>
            <span class="service-card__price">{{ money(item.totalAmount, data.currency) }}</span>
          </div>
          <p v-if="remainingServices" class="service-card__more">+ {{ number(remainingServices) }} خدمت دیگر</p>
        </div>
        <p v-else class="service-card__empty">خدمتی ثبت نشده است</p>
      </div>
    </section>

    <footer class="service-card__footer">
      <span>مراقبت حرفه‌ای از خودروی شما</span>
      <div class="service-card__shop-meta">
        <span v-if="data.shopCity">{{ data.shopCity }}</span>
        <i v-if="data.shopCity && data.shopPhone" />
        <span v-if="data.shopPhone" dir="ltr">{{ data.shopPhone }}</span>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.service-card {
  position: relative;
  display: flex;
  width: 1050px;
  height: 600px;
  padding: 30px 36px 22px;
  overflow: hidden;
  flex-direction: column;
  color: #fffdf8;
  background: #102019;
  font-family: "IRANYekan", Tahoma, Arial, sans-serif;
  isolation: isolate;
}

.service-card__glow {
  position: absolute;
  z-index: -1;
  border-radius: 999px;
}

.service-card__glow--right {
  top: -310px;
  right: -210px;
  width: 620px;
  height: 620px;
  background: radial-gradient(circle, rgba(73, 170, 120, .32), rgba(73, 170, 120, 0) 68%);
}

.service-card__glow--left {
  bottom: -390px;
  left: -220px;
  width: 650px;
  height: 650px;
  background: radial-gradient(circle, rgba(233, 169, 61, .17), rgba(233, 169, 61, 0) 68%);
}

.service-card__header,
.service-card__brand,
.service-card__group-header,
.service-card__item,
.service-card__footer,
.service-card__shop-meta {
  display: flex;
  align-items: center;
}

.service-card__header {
  min-height: 56px;
  justify-content: space-between;
}

.service-card__brand {
  min-width: 0;
  gap: 13px;
}

.service-card__mark {
  display: grid;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 17px;
  color: #7bc89e;
  background: rgba(255, 255, 255, .08);
}

.service-card__mark svg {
  width: 31px;
  height: 31px;
}

.service-card__brand-copy strong,
.service-card__brand-copy span {
  display: block;
}

.service-card__brand-copy strong {
  max-width: 520px;
  overflow: hidden;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-card__brand-copy span {
  margin-top: 1px;
  color: rgba(255, 255, 255, .48);
  font-size: 14px;
}

.service-card__header time {
  padding: 9px 14px;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 13px;
  color: rgba(255, 255, 255, .55);
  background: rgba(255, 255, 255, .045);
  font-size: 14px;
  white-space: nowrap;
}

.service-card__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1.05fr 1.35fr;
  gap: 9px;
  margin-top: 13px;
}

.service-card__metric {
  min-width: 0;
  height: 82px;
  padding: 12px 15px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 17px;
  background: rgba(255, 255, 255, .05);
}

.service-card__metric--total {
  border-color: rgba(123, 200, 158, .28);
  background: rgba(73, 170, 120, .15);
}

.service-card__metric span,
.service-card__metric strong,
.service-card__metric small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-card__metric span {
  color: rgba(255, 255, 255, .46);
  font-size: 12px;
}

.service-card__metric strong {
  margin-top: 3px;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.4;
}

.service-card__metric--total strong {
  color: #8bd5ab;
  font-size: 20px;
}

.service-card__metric .service-card__invoice {
  padding-top: 4px;
  font-size: 17px;
}

.service-card__metric small {
  color: rgba(255, 255, 255, .34);
  font-size: 10px;
}

.service-card__columns {
  display: grid;
  min-height: 0;
  margin-top: 13px;
  flex: 1;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}

.service-card__group {
  min-width: 0;
  padding: 14px 16px 12px;
  overflow: hidden;
  border-radius: 20px;
  color: #102019;
  background: #fffdf8;
  box-shadow: 0 14px 40px rgba(0, 0, 0, .14);
}

.service-card__group-header {
  height: 31px;
  justify-content: space-between;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(16, 32, 25, .08);
}

.service-card__group-header strong {
  font-size: 17px;
  font-weight: 900;
}

.service-card__group-header span {
  display: inline-flex;
  padding: 5px 10px;
  align-items: center;
  border-radius: 999px;
  color: #195a3e;
  background: #edf8f1;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.service-card__list {
  padding-top: 4px;
}

.service-card__item {
  min-width: 0;
  height: 50px;
  gap: 8px;
  border-bottom: 1px dashed rgba(16, 32, 25, .08);
}

.service-card__check {
  display: grid;
  width: 23px;
  height: 23px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #1e714a;
  background: #dff3e7;
}

.service-card__check svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.8;
}

.service-card__item strong {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-card__price {
  max-width: 145px;
  flex: 0 0 auto;
  overflow: hidden;
  color: #195a3e;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-card__more {
  margin: 6px 0 0;
  color: rgba(16, 32, 25, .45);
  font-size: 10px;
  text-align: center;
}

.service-card__empty {
  display: grid;
  height: 150px;
  margin: 0;
  place-items: center;
  color: rgba(16, 32, 25, .35);
  font-size: 13px;
}

.service-card__footer {
  min-height: 28px;
  justify-content: space-between;
  padding-top: 9px;
  color: rgba(255, 255, 255, .36);
  font-size: 11px;
}

.service-card__shop-meta {
  gap: 8px;
}

.service-card__shop-meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .3);
}
</style>
