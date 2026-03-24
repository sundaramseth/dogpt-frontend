import { supabase } from "../supabase";

function Nav({ user }) {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-row justify-between items-center py-2 px-3 bg-gray-50 border-b border-b-gray-200 w-full">

      <div className="text-xl font-bold md:mt-0 mt-8">
         DoGPT
      </div>

      <div className="flex flex-row justify-end gap-2 items-center">

        {user ? (
        <>
          <p>{user?.email}</p>
          <button
            onClick={logout}
            className="font-bold cursor-pointer hover:text-red-800"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <button onClick={loginWithGoogle} className="cursor-pointer hover:text-blue-800 font-bold text-sm">Login with Google</button>
        </>
      )}

      </div>

    </div>
  );
}

export default Nav;
