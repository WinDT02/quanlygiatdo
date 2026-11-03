package com.stu.edu.vn.repository;

import com.stu.edu.vn.entity.User;
import com.stu.edu.vn.entity.enums.AuthProvider;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /** Loads the role together with the user (avoids lazy-loading outside a session). */
    @EntityGraph(attributePaths = "role")
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Override
    @EntityGraph(attributePaths = "role")
    Optional<User> findById(Long id);

    /** Used by the upcoming Google (OAuth2) login. */
    @EntityGraph(attributePaths = "role")
    Optional<User> findByAuthProviderAndProviderId(AuthProvider authProvider, String providerId);
}
