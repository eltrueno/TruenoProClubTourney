<script setup lang="ts">
import Trophy from "@/assets/icons/wctrophy.svg?component";
</script>

<template>
  <div class="loader">

    <Trophy class="trophy" />

    <div class="dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>

<style scoped>

.loader{
    position:relative;
    width:110px;
    height:130px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    overflow:visible;
}

/* ---------------- Trophy ---------------- */

.trophy{
    width:72px;
    height:72px;
    color:#C5923B;
    z-index:2;
    animation:
        float 1.8s ease-in-out infinite,
        glow 1.8s ease-in-out infinite;
}

.trophy :deep(svg){
    width:100%;
    height:100%;
    fill:currentColor;
}

/* ---------------- Dots ---------------- */

.dots{
    display:flex;
    gap:.4rem;
    margin-top:.8rem;
}

.dots span{
    width:6px;
    height:6px;
    border-radius:999px;
    background:#C5923B;
    opacity:.25;
    animation:bounce 1s infinite;
}

.dots span:nth-child(2){
    animation-delay:.15s;
}

.dots span:nth-child(3){
    animation-delay:.3s;
}


@keyframes float{
    0%,100%{
        transform:translateY(0);
    }
    50%{
        transform:translateY(-4px);
    }

}

@keyframes glow{
    0%,100%{
        filter:
            drop-shadow(0 0 4px rgba(197,146,59,.25));
    }
    50%{
        filter:
            drop-shadow(0 0 18px rgba(197,146,59,.85));
    }
}

@keyframes shimmer {

    0% {
        transform: translateX(-20%);
    }

    100% {
        transform: translateX(20%);
    }

}


@keyframes bounce{
    0%,80%,100%{
        opacity:.25;
        transform:translateY(0);
    }
    40%{
        opacity:1;
        transform:translateY(-5px);
    }
}

</style>