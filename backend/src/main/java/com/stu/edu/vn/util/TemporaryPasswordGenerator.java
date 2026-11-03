package com.stu.edu.vn.util;

import java.security.SecureRandom;

/**
 * Generates a random password for accounts created by an admin (e.g. new employees).
 * Uses {@link SecureRandom}; ambiguous characters (0/O, 1/l/I) are left out so it is easy to read out loud.
 * The result always contains at least one upper-case letter, one lower-case letter and one digit.
 */
public final class TemporaryPasswordGenerator {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String ALL = UPPER + LOWER + DIGITS;
    private static final int LENGTH = 12;

    private static final SecureRandom RANDOM = new SecureRandom();

    private TemporaryPasswordGenerator() {
    }

    public static String generate() {
        char[] chars = new char[LENGTH];
        chars[0] = pick(UPPER);
        chars[1] = pick(LOWER);
        chars[2] = pick(DIGITS);
        for (int i = 3; i < LENGTH; i++) {
            chars[i] = pick(ALL);
        }
        // Fisher-Yates shuffle so the three guaranteed characters are not always at the front
        for (int i = LENGTH - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }

    private static char pick(String alphabet) {
        return alphabet.charAt(RANDOM.nextInt(alphabet.length()));
    }
}
