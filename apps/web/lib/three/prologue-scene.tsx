"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function PrologueScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 70;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const particleCount = 1400;
    const positions = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 180;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: "#f6e7bf",
      size: 0.7,
      transparent: true,
      opacity: 0.68
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const ambient = new THREE.AmbientLight("#f8d58e", 0.8);
    scene.add(ambient);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      points.rotation.y += 0.0009;
      points.rotation.x += 0.0003;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      mount.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} className="prologue-three" aria-hidden="true" />;
}
