useEffect(() => {
  console.log("AUTH 1: useEffect started");

  let isMounted = true;

  const initAuth = async () => {
    console.log("AUTH 2: initAuth");

    try {
      console.log("AUTH 3: before getSession");

      const result = await supabase.auth.getSession();

      console.log("AUTH 4: after getSession", result);

      const session = result.data.session;

      if (!isMounted) return;

      setSession(session);

      if (session?.user) {
        console.log("AUTH 5: user found");

        setUser(session.user);

        const userRole = await determineRole(session.user.id);

        console.log("AUTH 6: role", userRole);

        if (isMounted) setRole(userRole);
      }

    } catch (e) {
      console.error("AUTH ERROR", e);
    } finally {
      console.log("AUTH 7: loading false");
      if (isMounted) setLoading(false);
    }
  };

  initAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("AUTH EVENT", event, session);

    setSession(session);

    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
      setRole(null);
    }

    setLoading(false);
  });

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);