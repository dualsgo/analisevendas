import { Variants } from "framer-motion";

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2, ease: "easeIn" }
    }
};

export const slideUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    },
    exit: {
        opacity: 0,
        y: 20,
        transition: { duration: 0.3, ease: "easeIn" }
    }
};

export const zoomIn: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, type: "spring", stiffness: 300, damping: 30 }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.3, ease: "easeIn" }
    }
};

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        }
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.05,
            staggerDirection: -1
        }
    }
};

export const childItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.2, ease: "easeIn" }
    }
};
